#!/usr/bin/env python3
"""
MicroMarket Backend API Testing Suite
Tests all backend endpoints for the digital wholesale marketplace
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from frontend .env file
def get_backend_url():
    try:
        with open('/app/frontend/.env', 'r') as f:
            for line in f:
                if line.startswith('REACT_APP_BACKEND_URL='):
                    return line.split('=', 1)[1].strip()
    except FileNotFoundError:
        return "http://localhost:8001"
    return "http://localhost:8001"

BASE_URL = get_backend_url() + "/api"
print(f"Testing backend at: {BASE_URL}")

class MicroMarketTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_data = {
            "email": "maria.gonzalez@streetvendor.com",
            "name": "Maria Gonzalez",
            "password": "SecurePass123!",
            "user_type": "vendor"
        }
        self.supplier_user_data = {
            "email": "carlos.fresh@supplier.com", 
            "name": "Carlos Fresh Produce",
            "password": "SupplierPass456!",
            "user_type": "supplier"
        }
        self.results = {
            "passed": 0,
            "failed": 0,
            "errors": []
        }

    def log_result(self, test_name, success, message="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        
        if success:
            self.results["passed"] += 1
        else:
            self.results["failed"] += 1
            self.results["errors"].append(f"{test_name}: {message}")
        print()

    def test_demo_initialization(self):
        """Test demo data initialization endpoint"""
        print("=== Testing Demo Data Initialization ===")
        
        try:
            response = self.session.post(f"{self.base_url}/demo/init")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("Demo Data Initialization", True, 
                                  f"Demo data initialized: {data['message']}")
                    return True
                else:
                    self.log_result("Demo Data Initialization", False, 
                                  "Missing message in response", data)
            else:
                self.log_result("Demo Data Initialization", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Demo Data Initialization", False, f"Exception: {str(e)}")
        
        return False

    def test_user_registration(self):
        """Test user registration endpoint"""
        print("=== Testing User Registration ===")
        
        try:
            # Test vendor registration
            response = self.session.post(
                f"{self.base_url}/auth/register",
                json=self.test_user_data
            )
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["access_token", "token_type", "user"]
                
                if all(field in data for field in required_fields):
                    user = data["user"]
                    if (user["email"] == self.test_user_data["email"] and 
                        user["name"] == self.test_user_data["name"] and
                        user["user_type"] == self.test_user_data["user_type"]):
                        
                        self.auth_token = data["access_token"]
                        self.log_result("Vendor Registration", True, 
                                      f"User registered successfully with token")
                        return True
                    else:
                        self.log_result("Vendor Registration", False, 
                                      "User data mismatch", user)
                else:
                    self.log_result("Vendor Registration", False, 
                                  "Missing required fields in response", data)
            else:
                self.log_result("Vendor Registration", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Vendor Registration", False, f"Exception: {str(e)}")
        
        return False

    def test_supplier_registration(self):
        """Test supplier user registration"""
        print("=== Testing Supplier Registration ===")
        
        try:
            response = self.session.post(
                f"{self.base_url}/auth/register",
                json=self.supplier_user_data
            )
            
            if response.status_code == 200:
                data = response.json()
                user = data.get("user", {})
                if user.get("user_type") == "supplier":
                    self.log_result("Supplier Registration", True, 
                                  "Supplier user registered successfully")
                    return True
                else:
                    self.log_result("Supplier Registration", False, 
                                  "User type mismatch", user)
            else:
                self.log_result("Supplier Registration", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Supplier Registration", False, f"Exception: {str(e)}")
        
        return False

    def test_user_login(self):
        """Test user login endpoint"""
        print("=== Testing User Login ===")
        
        try:
            login_data = {
                "email": self.test_user_data["email"],
                "password": self.test_user_data["password"]
            }
            
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json=login_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    self.auth_token = data["access_token"]
                    self.log_result("User Login", True, "Login successful with valid token")
                    return True
                else:
                    self.log_result("User Login", False, "Missing token or user data", data)
            else:
                self.log_result("User Login", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("User Login", False, f"Exception: {str(e)}")
        
        return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        print("=== Testing Invalid Login ===")
        
        try:
            invalid_login = {
                "email": self.test_user_data["email"],
                "password": "wrongpassword"
            }
            
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json=invalid_login
            )
            
            if response.status_code == 401:
                self.log_result("Invalid Login Rejection", True, 
                              "Correctly rejected invalid credentials")
                return True
            else:
                self.log_result("Invalid Login Rejection", False, 
                              f"Expected 401, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Invalid Login Rejection", False, f"Exception: {str(e)}")
        
        return False

    def test_suppliers_endpoint(self):
        """Test suppliers listing endpoint"""
        print("=== Testing Suppliers Endpoint ===")
        
        try:
            response = self.session.get(f"{self.base_url}/suppliers")
            
            if response.status_code == 200:
                suppliers = response.json()
                
                if isinstance(suppliers, list) and len(suppliers) > 0:
                    # Check first supplier structure
                    supplier = suppliers[0]
                    required_fields = ["id", "stall_name", "description", "image_url", 
                                     "contact_phone", "location", "rating"]
                    
                    if all(field in supplier for field in required_fields):
                        self.log_result("Suppliers Listing", True, 
                                      f"Retrieved {len(suppliers)} suppliers with correct structure")
                        return suppliers
                    else:
                        missing = [f for f in required_fields if f not in supplier]
                        self.log_result("Suppliers Listing", False, 
                                      f"Missing fields: {missing}", supplier)
                else:
                    self.log_result("Suppliers Listing", False, 
                                  "No suppliers found or invalid format", suppliers)
            else:
                self.log_result("Suppliers Listing", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Suppliers Listing", False, f"Exception: {str(e)}")
        
        return []

    def test_supplier_products(self, suppliers):
        """Test products by supplier endpoint"""
        print("=== Testing Supplier Products ===")
        
        if not suppliers:
            self.log_result("Supplier Products", False, "No suppliers available for testing")
            return []
        
        try:
            supplier_id = suppliers[0]["id"]
            response = self.session.get(f"{self.base_url}/suppliers/{supplier_id}/products")
            
            if response.status_code == 200:
                products = response.json()
                
                if isinstance(products, list) and len(products) > 0:
                    # Check product structure
                    product = products[0]
                    required_fields = ["id", "supplier_id", "name", "category", 
                                     "price_per_unit", "unit", "quantity_available"]
                    
                    if all(field in product for field in required_fields):
                        self.log_result("Supplier Products", True, 
                                      f"Retrieved {len(products)} products for supplier")
                        return products
                    else:
                        missing = [f for f in required_fields if f not in product]
                        self.log_result("Supplier Products", False, 
                                      f"Missing fields: {missing}", product)
                else:
                    self.log_result("Supplier Products", False, 
                                  "No products found", products)
            else:
                self.log_result("Supplier Products", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Supplier Products", False, f"Exception: {str(e)}")
        
        return []

    def test_cart_without_auth(self):
        """Test cart access without authentication"""
        print("=== Testing Cart Without Authentication ===")
        
        try:
            response = self.session.get(f"{self.base_url}/cart")
            
            if response.status_code == 403:
                self.log_result("Cart Auth Protection", True, 
                              "Cart correctly requires authentication")
                return True
            else:
                self.log_result("Cart Auth Protection", False, 
                              f"Expected 403, got {response.status_code}")
                
        except Exception as e:
            self.log_result("Cart Auth Protection", False, f"Exception: {str(e)}")
        
        return False

    def test_cart_with_auth(self):
        """Test cart access with authentication"""
        print("=== Testing Cart With Authentication ===")
        
        if not self.auth_token:
            self.log_result("Cart With Auth", False, "No auth token available")
            return None
        
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{self.base_url}/cart", headers=headers)
            
            if response.status_code == 200:
                cart = response.json()
                required_fields = ["id", "vendor_id", "items", "total_amount"]
                
                if all(field in cart for field in required_fields):
                    self.log_result("Cart Access", True, 
                                  "Cart retrieved successfully with auth")
                    return cart
                else:
                    missing = [f for f in required_fields if f not in cart]
                    self.log_result("Cart Access", False, 
                                  f"Missing fields: {missing}", cart)
            else:
                self.log_result("Cart Access", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Cart Access", False, f"Exception: {str(e)}")
        
        return None

    def test_add_to_cart(self, products):
        """Test adding items to cart"""
        print("=== Testing Add to Cart ===")
        
        if not self.auth_token:
            self.log_result("Add to Cart", False, "No auth token available")
            return False
        
        if not products:
            self.log_result("Add to Cart", False, "No products available for testing")
            return False
        
        try:
            product = products[0]
            cart_item = {
                "product_id": product["id"],
                "supplier_id": product["supplier_id"],
                "quantity": 5,
                "price_per_unit": product["price_per_unit"]
            }
            
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.post(
                f"{self.base_url}/cart/add",
                json=cart_item,
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_result("Add to Cart", True, 
                                  f"Item added to cart: {data['message']}")
                    return True
                else:
                    self.log_result("Add to Cart", False, 
                                  "Missing message in response", data)
            else:
                self.log_result("Add to Cart", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Add to Cart", False, f"Exception: {str(e)}")
        
        return False

    def test_cart_state_after_add(self):
        """Test cart state after adding items"""
        print("=== Testing Cart State After Adding Items ===")
        
        if not self.auth_token:
            self.log_result("Cart State Check", False, "No auth token available")
            return False
        
        try:
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            response = self.session.get(f"{self.base_url}/cart", headers=headers)
            
            if response.status_code == 200:
                cart = response.json()
                
                if len(cart["items"]) > 0 and cart["total_amount"] > 0:
                    self.log_result("Cart State Check", True, 
                                  f"Cart has {len(cart['items'])} items, total: ${cart['total_amount']}")
                    return True
                else:
                    self.log_result("Cart State Check", False, 
                                  "Cart is empty after adding items", cart)
            else:
                self.log_result("Cart State Check", False, 
                              f"HTTP {response.status_code}", response.text)
                
        except Exception as e:
            self.log_result("Cart State Check", False, f"Exception: {str(e)}")
        
        return False

    def run_all_tests(self):
        """Run all backend tests in sequence"""
        print("🚀 Starting MicroMarket Backend API Tests")
        print("=" * 50)
        
        # Test demo data initialization first
        self.test_demo_initialization()
        
        # Test authentication system
        self.test_user_registration()
        self.test_supplier_registration()
        self.test_user_login()
        self.test_invalid_login()
        
        # Test supplier management
        suppliers = self.test_suppliers_endpoint()
        
        # Test product management
        products = self.test_supplier_products(suppliers)
        
        # Test cart system
        self.test_cart_without_auth()
        cart = self.test_cart_with_auth()
        self.test_add_to_cart(products)
        self.test_cart_state_after_add()
        
        # Print final results
        print("=" * 50)
        print("🏁 Test Results Summary")
        print(f"✅ Passed: {self.results['passed']}")
        print(f"❌ Failed: {self.results['failed']}")
        print(f"📊 Success Rate: {(self.results['passed']/(self.results['passed']+self.results['failed'])*100):.1f}%")
        
        if self.results["errors"]:
            print("\n🚨 Failed Tests:")
            for error in self.results["errors"]:
                print(f"   • {error}")
        
        return self.results["failed"] == 0

if __name__ == "__main__":
    tester = MicroMarketTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)