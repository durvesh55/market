from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import bcrypt
import jwt
from pydantic import EmailStr

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="MicroMarket API", description="Digital Wholesale Marketplace API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# JWT Configuration
JWT_SECRET = "micromarket_secret_key_2025"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 24

security = HTTPBearer()

# Define Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    user_type: str  # 'vendor' or 'supplier'
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str
    user_type: str  # 'vendor' or 'supplier'

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

class Supplier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    stall_name: str
    description: str
    image_url: str
    contact_phone: str
    location: str
    rating: float = 4.5
    delivery_rating: float = 4.2
    total_reviews: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SupplierCreate(BaseModel):
    stall_name: str
    description: str
    image_url: str
    contact_phone: str
    location: str

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    supplier_id: str
    name: str
    category: str
    price_per_unit: float
    unit: str  # kg, lbs, pieces, etc.
    quantity_available: int
    bulk_discount_tiers: List[dict] = []  # [{"min_qty": 10, "discount": 0.1}]
    image_url: str
    description: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ProductCreate(BaseModel):
    name: str
    category: str
    price_per_unit: float
    unit: str
    quantity_available: int
    bulk_discount_tiers: List[dict] = []
    image_url: str
    description: str

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    price_per_unit: Optional[float] = None
    unit: Optional[str] = None
    quantity_available: Optional[int] = None
    bulk_discount_tiers: Optional[List[dict]] = None
    image_url: Optional[str] = None
    description: Optional[str] = None

class Review(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    supplier_id: str
    rating: int  # 1-5
    comment: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewCreate(BaseModel):
    supplier_id: str
    rating: int
    comment: str

class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    type: str  # 'price_drop', 'bulk_discount', 'new_product'
    title: str
    message: str
    is_read: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CartItem(BaseModel):
    product_id: str
    supplier_id: str
    quantity: int
    price_per_unit: float
    name: Optional[str] = None  # Product name will be populated in responses

class Cart(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    items: List[CartItem] = []
    total_amount: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    supplier_id: str
    items: List[CartItem]
    total_amount: float
    status: str = "pending"  # pending, confirmed, delivered, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Authentication Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        name=user_data.name,
        user_type=user_data.user_type
    )
    
    # Store user with hashed password
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    await db.users.insert_one(user_dict)
    
    # Create JWT token
    token = create_jwt_token(user.id, user.email)
    
    return Token(access_token=token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    # Find user
    user_doc = await db.users.find_one({"email": login_data.email})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Verify password
    if not verify_password(login_data.password, user_doc["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_doc)
    token = create_jwt_token(user.id, user.email)
    
    return Token(access_token=token, token_type="bearer", user=user)

# Supplier Routes
@api_router.get("/suppliers", response_model=List[Supplier])
async def get_suppliers(
    category: Optional[str] = None,
    min_rating: Optional[float] = None,
    location: Optional[str] = None
):
    query = {}
    if category:
        # Find suppliers that have products in this category
        products = await db.products.find({"category": category}).to_list(100)
        supplier_ids = list(set([p["supplier_id"] for p in products]))
        query["id"] = {"$in": supplier_ids}
    
    if min_rating:
        query["rating"] = {"$gte": min_rating}
    
    if location:
        query["location"] = {"$regex": location, "$options": "i"}
    
    suppliers = await db.suppliers.find(query).to_list(100)
    return [Supplier(**supplier) for supplier in suppliers]

@api_router.post("/suppliers", response_model=Supplier)
async def create_supplier(supplier_data: SupplierCreate, current_user: User = Depends(get_current_user)):
    if current_user.user_type != "supplier":
        raise HTTPException(status_code=403, detail="Only suppliers can create stalls")
    
    # Check if user already has a supplier profile
    existing = await db.suppliers.find_one({"user_id": current_user.id})
    if existing:
        raise HTTPException(status_code=400, detail="Supplier profile already exists")
    
    supplier = Supplier(
        user_id=current_user.id,
        **supplier_data.dict()
    )
    
    await db.suppliers.insert_one(supplier.dict())
    return supplier

@api_router.get("/suppliers/my-stall", response_model=Supplier)
async def get_my_stall(current_user: User = Depends(get_current_user)):
    if current_user.user_type != "supplier":
        raise HTTPException(status_code=403, detail="Only suppliers can access stall data")
    
    supplier = await db.suppliers.find_one({"user_id": current_user.id})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    
    return Supplier(**supplier)

@api_router.get("/suppliers/{supplier_id}/products", response_model=List[Product])
async def get_supplier_products(
    supplier_id: str,
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_quantity: Optional[int] = None
):
    query = {"supplier_id": supplier_id}
    
    if category:
        query["category"] = category
    if min_price:
        query["price_per_unit"] = {"$gte": min_price}
    if max_price:
        if "price_per_unit" in query:
            query["price_per_unit"]["$lte"] = max_price
        else:
            query["price_per_unit"] = {"$lte": max_price}
    if min_quantity:
        query["quantity_available"] = {"$gte": min_quantity}
    
    products = await db.products.find(query).to_list(100)
    return [Product(**product) for product in products]

@api_router.get("/suppliers/{supplier_id}/reviews", response_model=List[Review])
async def get_supplier_reviews(supplier_id: str):
    reviews = await db.reviews.find({"supplier_id": supplier_id}).to_list(100)
    return [Review(**review) for review in reviews]

# Product Routes
@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: User = Depends(get_current_user)):
    if current_user.user_type != "supplier":
        raise HTTPException(status_code=403, detail="Only suppliers can create products")
    
    # Get supplier profile
    supplier = await db.suppliers.find_one({"user_id": current_user.id})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    
    product = Product(
        supplier_id=supplier["id"],
        **product_data.dict()
    )
    
    await db.products.insert_one(product.dict())
    return product

@api_router.get("/products/my-products", response_model=List[Product])
async def get_my_products(current_user: User = Depends(get_current_user)):
    if current_user.user_type != "supplier":
        raise HTTPException(status_code=403, detail="Only suppliers can access product data")
    
    supplier = await db.suppliers.find_one({"user_id": current_user.id})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    
    products = await db.products.find({"supplier_id": supplier["id"]}).to_list(100)
    return [Product(**product) for product in products]

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductUpdate, current_user: User = Depends(get_current_user)):
    if current_user.user_type != "supplier":
        raise HTTPException(status_code=403, detail="Only suppliers can update products")
    
    # Check if product belongs to current supplier
    supplier = await db.suppliers.find_one({"user_id": current_user.id})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    
    product = await db.products.find_one({"id": product_id, "supplier_id": supplier["id"]})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update product
    update_data = {k: v for k, v in product_data.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated_product = await db.products.find_one({"id": product_id})
    return Product(**updated_product)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: User = Depends(get_current_user)):
    if current_user.user_type != "supplier":
        raise HTTPException(status_code=403, detail="Only suppliers can delete products")
    
    supplier = await db.suppliers.find_one({"user_id": current_user.id})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    
    result = await db.products.delete_one({"id": product_id, "supplier_id": supplier["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    return {"message": "Product deleted successfully"}

# Review Routes
@api_router.post("/reviews", response_model=Review)
async def create_review(review_data: ReviewCreate, current_user: User = Depends(get_current_user)):
    if current_user.user_type != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can create reviews")
    
    # Check if review already exists
    existing = await db.reviews.find_one({
        "vendor_id": current_user.id,
        "supplier_id": review_data.supplier_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Review already exists for this supplier")
    
    review = Review(
        vendor_id=current_user.id,
        **review_data.dict()
    )
    
    await db.reviews.insert_one(review.dict())
    
    # Update supplier rating
    reviews = await db.reviews.find({"supplier_id": review_data.supplier_id}).to_list(100)
    avg_rating = sum([r["rating"] for r in reviews]) / len(reviews)
    
    await db.suppliers.update_one(
        {"id": review_data.supplier_id},
        {"$set": {"rating": round(avg_rating, 1), "total_reviews": len(reviews)}}
    )
    
    return review

# Notification Routes
@api_router.get("/notifications", response_model=List[Notification])
async def get_notifications(current_user: User = Depends(get_current_user)):
    notifications = await db.notifications.find({"user_id": current_user.id}).sort("created_at", -1).to_list(50)
    return [Notification(**notif) for notif in notifications]

@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: User = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user.id},
        {"$set": {"is_read": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    return {"message": "Notification marked as read"}

# Cart Routes
@api_router.get("/cart", response_model=Cart)
async def get_cart(current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"vendor_id": current_user.id})
    if not cart:
        # Create empty cart
        empty_cart = Cart(vendor_id=current_user.id)
        await db.carts.insert_one(empty_cart.dict())
        return empty_cart
    
    cart_obj = Cart(**cart)
    
    # Enrich cart items with product names
    for item in cart_obj.items:
        product = await db.products.find_one({"id": item.product_id})
        if product:
            item.name = product.get("name", "Unknown Product")
    
    return cart_obj

@api_router.post("/cart/add")
async def add_to_cart(cart_item: CartItem, current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"vendor_id": current_user.id})
    
    if not cart:
        # Create new cart
        new_cart = Cart(vendor_id=current_user.id, items=[cart_item])
        new_cart.total_amount = cart_item.quantity * cart_item.price_per_unit
        await db.carts.insert_one(new_cart.dict())
        return {"message": "Item added to cart"}
    
    # Update existing cart
    cart_obj = Cart(**cart)
    
    # Check if product already in cart
    existing_item = None
    for item in cart_obj.items:
        if item.product_id == cart_item.product_id:
            existing_item = item
            break
    
    if existing_item:
        existing_item.quantity += cart_item.quantity
    else:
        cart_obj.items.append(cart_item)
    
    # Recalculate total
    cart_obj.total_amount = sum(item.quantity * item.price_per_unit for item in cart_obj.items)
    cart_obj.updated_at = datetime.utcnow()
    
    await db.carts.replace_one({"vendor_id": current_user.id}, cart_obj.dict())
    return {"message": "Item added to cart"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"vendor_id": current_user.id})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart_obj = Cart(**cart)
    
    # Find and remove the item
    item_to_remove = None
    for item in cart_obj.items:
        if item.product_id == product_id:
            item_to_remove = item
            break
    
    if not item_to_remove:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    
    cart_obj.items.remove(item_to_remove)
    
    # Recalculate total
    cart_obj.total_amount = sum(item.quantity * item.price_per_unit for item in cart_obj.items)
    cart_obj.updated_at = datetime.utcnow()
    
    await db.carts.replace_one({"vendor_id": current_user.id}, cart_obj.dict())
    return {"message": "Item removed from cart"}

@api_router.put("/cart/update/{product_id}")
async def update_cart_item(product_id: str, quantity: int = Query(...), current_user: User = Depends(get_current_user)):
    cart = await db.carts.find_one({"vendor_id": current_user.id})
    
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart_obj = Cart(**cart)
    
    # Find and update the item
    item_to_update = None
    for item in cart_obj.items:
        if item.product_id == product_id:
            item_to_update = item
            break
    
    if not item_to_update:
        raise HTTPException(status_code=404, detail="Item not found in cart")
    
    if quantity <= 0:
        cart_obj.items.remove(item_to_update)
    else:
        item_to_update.quantity = quantity
    
    # Recalculate total
    cart_obj.total_amount = sum(item.quantity * item.price_per_unit for item in cart_obj.items)
    cart_obj.updated_at = datetime.utcnow()
    
    await db.carts.replace_one({"vendor_id": current_user.id}, cart_obj.dict())
    return {"message": "Cart updated"}

# Orders Routes
@api_router.get("/orders/my-orders", response_model=List[Order])
async def get_my_orders(current_user: User = Depends(get_current_user)):
    if current_user.user_type == "vendor":
        orders = await db.orders.find({"vendor_id": current_user.id}).to_list(100)
    else:  # supplier
        orders = await db.orders.find({"supplier_id": current_user.id}).to_list(100)
    
    return [Order(**order) for order in orders]

# Analytics Routes (for suppliers)
@api_router.get("/analytics/dashboard")
async def get_supplier_analytics(current_user: User = Depends(get_current_user)):
    if current_user.user_type != "supplier":
        raise HTTPException(status_code=403, detail="Only suppliers can access analytics")
    
    supplier = await db.suppliers.find_one({"user_id": current_user.id})
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    
    # Get product count
    product_count = await db.products.count_documents({"supplier_id": supplier["id"]})
    
    # Get orders count
    orders_count = await db.orders.count_documents({"supplier_id": supplier["id"]})
    
    # Get total revenue (mock data for now)
    total_revenue = orders_count * 150.0  # Mock calculation
    
    # Get top products (mock data)
    products = await db.products.find({"supplier_id": supplier["id"]}).to_list(5)
    top_products = [{"name": p["name"], "sales": 25} for p in products[:3]]
    
    return {
        "total_products": product_count,
        "total_orders": orders_count,
        "total_revenue": total_revenue,
        "top_products": top_products,
        "rating": supplier["rating"],
        "total_reviews": supplier["total_reviews"]
    }

# Demo data initialization
@api_router.post("/demo/init")
async def initialize_demo_data():
    # Check if demo data already exists
    existing_suppliers = await db.suppliers.count_documents({})
    if existing_suppliers > 0:
        return {"message": "Demo data already exists"}
    
    # Create demo suppliers
    demo_suppliers = [
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo_user_1",
            "stall_name": "Fresh Valley Farms",
            "description": "Premium fresh vegetables and herbs directly from our organic farm",
            "image_url": "https://images.unsplash.com/photo-1532079563951-0c8a7dacddb3",
            "contact_phone": "+1-555-0123",
            "location": "Central Market District",
            "rating": 4.8,
            "delivery_rating": 4.5,
            "total_reviews": 45,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo_user_2", 
            "stall_name": "Tropical Fruits Paradise",
            "description": "Exotic fruits and seasonal produce from local and international sources",
            "image_url": "https://images.unsplash.com/photo-1488459716781-31db52582fe9",
            "contact_phone": "+1-555-0456",
            "location": "East Market Zone",
            "rating": 4.6,
            "delivery_rating": 4.3,
            "total_reviews": 32,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "user_id": "demo_user_3",
            "stall_name": "Spice & Herb Corner",
            "description": "Authentic spices, dried herbs, and specialty seasonings for street food vendors",
            "image_url": "https://images.unsplash.com/photo-1550989460-0adf9ea622e2",
            "contact_phone": "+1-555-0789",
            "location": "Spice Alley",
            "rating": 4.9,
            "delivery_rating": 4.7,
            "total_reviews": 68,
            "created_at": datetime.utcnow()
        }
    ]
    
    await db.suppliers.insert_many(demo_suppliers)
    
    # Create demo products with better variety and bulk pricing
    demo_products = []
    
    # Fresh Valley Farms products
    valley_products = [
        {"name": "Organic Tomatoes", "category": "Vegetables", "price": 3.50, "qty": 200, "desc": "Fresh vine-ripened organic tomatoes"},
        {"name": "Fresh Lettuce", "category": "Vegetables", "price": 2.25, "qty": 150, "desc": "Crisp romaine lettuce heads"},
        {"name": "Bell Peppers Mix", "category": "Vegetables", "price": 4.00, "qty": 180, "desc": "Colorful bell pepper variety pack"},
        {"name": "Fresh Basil", "category": "Herbs", "price": 6.50, "qty": 80, "desc": "Aromatic fresh basil leaves"},
        {"name": "Organic Spinach", "category": "Vegetables", "price": 3.75, "qty": 120, "desc": "Baby spinach leaves"}
    ]
    
    # Tropical Fruits products
    tropical_products = [
        {"name": "Premium Mangoes", "category": "Fruits", "price": 5.00, "qty": 100, "desc": "Sweet tropical mangoes"},
        {"name": "Fresh Pineapples", "category": "Fruits", "price": 4.50, "qty": 75, "desc": "Juicy ripe pineapples"},
        {"name": "Dragon Fruit", "category": "Fruits", "price": 8.00, "qty": 60, "desc": "Exotic dragon fruit"},
        {"name": "Coconuts", "category": "Fruits", "price": 3.00, "qty": 90, "desc": "Fresh coconuts"},
        {"name": "Passion Fruit", "category": "Fruits", "price": 12.00, "qty": 40, "desc": "Aromatic passion fruit"}
    ]
    
    # Spice & Herb products
    spice_products = [
        {"name": "Cumin Powder", "category": "Spices", "price": 15.00, "qty": 50, "desc": "Ground cumin spice"},
        {"name": "Turmeric Powder", "category": "Spices", "price": 12.00, "qty": 60, "desc": "Pure turmeric powder"},
        {"name": "Dried Oregano", "category": "Herbs", "price": 18.00, "qty": 45, "desc": "Mediterranean oregano"},
        {"name": "Chili Powder", "category": "Spices", "price": 16.50, "qty": 55, "desc": "Spicy chili powder blend"},
        {"name": "Bay Leaves", "category": "Herbs", "price": 20.00, "qty": 30, "desc": "Aromatic bay leaves"}
    ]
    
    all_product_sets = [
        (demo_suppliers[0]["id"], valley_products),
        (demo_suppliers[1]["id"], tropical_products),
        (demo_suppliers[2]["id"], spice_products)
    ]
    
    for supplier_id, products in all_product_sets:
        for prod in products:
            product = {
                "id": str(uuid.uuid4()),
                "supplier_id": supplier_id,
                "name": prod["name"],
                "category": prod["category"],
                "price_per_unit": prod["price"],
                "unit": "kg",
                "quantity_available": prod["qty"],
                "bulk_discount_tiers": [
                    {"min_qty": 10, "discount": 0.05, "label": "10+ kg: 5% off"},
                    {"min_qty": 25, "discount": 0.10, "label": "25+ kg: 10% off"},
                    {"min_qty": 50, "discount": 0.15, "label": "50+ kg: 15% off"},
                    {"min_qty": 100, "discount": 0.20, "label": "100+ kg: 20% off"}
                ],
                "image_url": demo_suppliers[0]["image_url"],
                "description": prod["desc"],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            demo_products.append(product)
    
    await db.products.insert_many(demo_products)
    
    return {"message": "Demo data initialized successfully"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()