import re

all_known_categories = [
    '2.5 Inch NEW', '2.5 USED', 'Adapters', 'Branded PC', 'CAMERA', 'CASES', 'CPU', 'Cables', 
    'Chargers', 'Connectors', 'Coolers & Fans', 'DESKTOP RAM NEW', 'DESKTOP RAM USED', 
    'FANTECH GAMING ACCESSORIES', 'FANTECH KEYBOARD', 'FANTECH MOUSE', 'FANTECH SPEAKERS & HEADPHONES', 
    'Graphics Card', 'HDD', 'Headphones & Speakers', 'Items lIst 1', 'Keyboard & Mouse', 
    'LAPTOP RAM NEW', 'LAPTOP RAM USED', 'Laptop Accessories', 'Laptop Batteries', 
    'Laptop Cooling Fan', 'Laptop Keyboards', 'Laptop Power Adapters', 'Laptop Screens', 
    'Laptops', 'M.2 NGFF NEW', 'M.2 NVMe NEW', 'M.2 USED', 'MINI PC', 'Monitors', 
    'Motherboard', 'NVME USED', 'Other', 'POWERSUPPLY', 'Pendrives & SD Cards', 
    'PowerBanks & Batteries', 'Printers', 'ROUTERS', 'SSD USED', 'Softwares & Services', 'Virus Guards', '(none)'
]

test_lines = [
    "1 1510 (none) 15 inch LCD Monitor Used (1m Warranty) -1 0.00 0.00 0.00 -2,500.00 -2,500.00",
    "1590 HY-210 TV Mount Full Adjustment 10-32 Inch 4 (none) 0 1,000.00 0.00 0.00 0.00 0.00",
    "1048 Kingston A400 120GB Sata SSD New (3Y Warranty ) 9 2.5 Inch NEW 0 3,250.00 0.00 0.00 0.00 0.00",
    "16 1117 2.5 USED Intel 120GB Sata SSD Used (3m Warranty) 0 2,250.00 0.00 0.00 0.00 0.00",
    "24 1105 Adapters 2.5 to 3.5 Bracket 9 160.00 1,440.00 1,440.00 3,150.00 3,150.00",
    "1051 Samsung 870 EVO 500GB SATA SSD New (3Y Warranty) 14 2.5 Inch NEW 0 9,250.00 0.00 0.00 0.00 0.00",
    "1464 2.5 inch Hard disk USB 2.0 Enclosure (6m Warranty0 29 Adapters 4 850.00 3,400.00 3,400.00 6,400.00 6,400.00",
    "28 1266 Adapters 1080P HDMI Splitter 1 to 2 1 1,250.00 1,250.00 1,250.00 2,200.00 2,200.00"
]

def parse_line(line):
    num_matches = list(re.finditer(r'(-?[\d,]+(?:\.\d{2})?)', line))
    if len(num_matches) < 5:
        return None
    prefix = line[:num_matches[-6].start()].strip()
    
    # Sort categories by length descending to match multi-word categories first
    sorted_cats = sorted(all_known_categories, key=len, reverse=True)
    
    # Check Format A: starts with row_idx code
    # e.g. "1 1510 (none) 15 inch..." or "16 1117 2.5 USED Intel..."
    mA = re.match(r'^(\d+)\s+(\d{3,5})\s+(.*)$', prefix)
    if mA:
        row_idx = mA.group(1)
        code = mA.group(2)
        remainder = mA.group(3).strip()
        matched_cat = "General"
        name = remainder
        for cat in sorted_cats:
            if remainder.lower().startswith(cat.lower()):
                matched_cat = "General" if cat == '(none)' else cat
                name = remainder[len(cat):].strip()
                break
        return {"code": code, "name": name, "category": matched_cat, "format": "A"}
    
    # Check Format B: code name row_idx category
    # e.g. "1590 HY-210 TV Mount Full Adjustment 10-32 Inch 4 (none)"
    # or "1048 Kingston A400... 9 2.5 Inch NEW"
    mB_code = re.match(r'^(\d{3,5})\s+(.*)$', prefix)
    if mB_code:
        code = mB_code.group(1)
        remainder = mB_code.group(2).strip()
        
        # Check if remainder ends with row_idx + category or category + row_idx
        for cat in sorted_cats:
            cat_pattern = re.escape(cat)
            # Pattern: name + row_idx + cat at end
            m_end = re.search(r'\s+(\d+)\s+' + cat_pattern + r'$', remainder, re.IGNORECASE)
            if m_end:
                name = remainder[:m_end.start()].strip()
                matched_cat = "General" if cat == '(none)' else cat
                return {"code": code, "name": name, "category": matched_cat, "format": "B1"}
            # Pattern: name + cat + row_idx at end
            m_end2 = re.search(r'\s+' + cat_pattern + r'\s+(\d+)$', remainder, re.IGNORECASE)
            if m_end2:
                name = remainder[:m_end2.start()].strip()
                matched_cat = "General" if cat == '(none)' else cat
                return {"code": code, "name": name, "category": matched_cat, "format": "B2"}
                
    return {"code": "UNKNOWN", "name": prefix, "category": "General", "format": "FALLBACK"}

for l in test_lines:
    res = parse_line(l)
    print(res)
