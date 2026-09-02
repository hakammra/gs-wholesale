import os

shop_pos_path = r'c:\Users\abdul\Documents\Shop-POS'

for root, dirs, files in os.walk(shop_pos_path):
    for f in files:
        if f.endswith(('.jsx', '.js')):
            full_path = os.path.join(root, f)
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as fl:
                content = fl.read()
                for keyword in ['stock in transit', 'purchase order', 'purchases', 'goods receiving', 'supplierorder', 'supplier_order', 'transit_shipment']:
                    if keyword in content.lower():
                        print(f"Found '{keyword}' in {full_path}")
