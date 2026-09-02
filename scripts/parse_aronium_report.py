import csv
import re
import os

raw_ocr = """
=== PAGE 1 ===
1 1510 (none) 15 inch LCD Monitor Used (1m Warranty) -1 0.00 0.00 0.00 -2,500.00 -2,500.00
2 1575 (none) Credit 0 0.00 0.00 0.00 0.00 0.00
3 1555 (none) Fan (used) 0 0.00 0.00 0.00 0.00 0.00
1590 HY-210 TV Mount Full Adjustment 10-32 Inch 4 (none) 0 1,000.00 0.00 0.00 0.00 0.00
1520 High Speed 256GB SD Card Taiwan C10 (3m Warranty) 5 (none) 1 4,100.00 4,100.00 4,100.00 7,500.00 7,500.00
1566 Networking Cable Tester New (6m Warranty) 6 (none) 0 0.00 0.00 0.00 0.00 0.00
1509 ViewSonic 19 inch C-Grade Monitor Used (1m Warranty) 7 (none) 0 2,000.00 0.00 0.00 0.00 0.00
8 1567 (none) Wiring Insulation Tape Roll - Small 0 0.00 0.00 0.00 0.00 0.00
1048 Kingston A400 120GB Sata SSD New (3Y Warranty ) 9 2.5 Inch NEW 0 3,250.00 0.00 0.00 0.00 0.00
1049 Kingston KC600 256GB SSD New (3Y Warranty) 10 2.5 Inch NEW 2 5,500.00 11,000.00 11,000.00 21,800.00 21,800.00
1050 Kingston KC600 512GB SSD New (3Y Warranty) 11 2.5 Inch NEW 0 9,000.00 0.00 0.00 0.00 0.00
1052 WD Green 120GB Sata SSD New (3Y Warranty) 12 2.5 Inch NEW 0 3,250.00 0.00 0.00 0.00 0.00
1481 AZEK 128GB SATA SSD NEW (2Y Warranty) 13 2.5 Inch NEW 2 6,250.00 12,500.00 12,500.00 15,800.00 15,800.00
1051 Samsung 870 EVO 500GB SATA SSD New (3Y Warranty) 14 2.5 Inch NEW 0 9,250.00 0.00 0.00 0.00 0.00
1368 Team Vulcan Z 1TB SATA SSD New (3Y Warranty) 15 2.5 Inch NEW 0 23,900.00 0.00 0.00 0.00 0.00
16 1117 2.5 USED Intel 120GB Sata SSD Used (3m Warranty) 0 2,250.00 0.00 0.00 0.00 0.00
1122 ADATA 480GB SATA SSD Used (3m Warranty) 17 2.5 USED 1 6,500.00 6,500.00 6,500.00 10,500.00 10,500.00
1119 Branded 120/128GB Sata SSD Used (3m Warranty) 18 2.5 USED -3 3,500.00 -10,500.00 -10,500.00 -14,700.00 -14,700.00
1402 Branded 240/256GB Sata SSD Used (3m Warranty) 19 2.5 USED 0 4,500.00 0.00 0.00 0.00 0.00
1432 Colorful 160GB Sata SSD Used (3m Warranty) 20 2.5 USED 0 3,250.00 0.00 0.00 0.00 0.00
1120 Mix Brand 120/128GB SSD Used (3m warranty) 21 2.5 USED 19 3,302.80 62,753.11 62,753.11 93,100.00 93,100.00

=== PAGE 2 ===
1121 Mix Brand 240/256GB SSD Used (3m Warranty) 22 2.5 USED 6 6,300.00 37,800.00 37,800.00 48,000.00 48,000.00
1118 WD Green 120GB Sata SSD Used (3m Warranty) 23 2.5 USED 1 3,500.00 3,500.00 3,500.00 3,900.00 3,900.00
24 1105 Adapters 2.5 to 3.5 Bracket 9 160.00 1,440.00 1,440.00 3,150.00 3,150.00
25 1089 Adapters HDMI TO VGA Adapter with audio 4 320.00 1,280.00 1,280.00 2,400.00 2,400.00
26 1031 Adapters Laptop Caddy Slim Black 11 325.00 3,575.00 3,575.00 6,600.00 6,600.00
27 1088 Adapters VGA TO DVI Adapter 3 350.00 1,050.00 1,050.00 2,100.00 2,100.00
28 1266 Adapters 1080P HDMI Splitter 1 to 2 1 1,250.00 1,250.00 1,250.00 2,200.00 2,200.00
1464 2.5 inch Hard disk USB 2.0 Enclosure (6m Warranty0 29 Adapters 4 850.00 3,400.00 3,400.00 6,400.00 6,400.00
1030 2.5 inch Hard disk USB 3.0 Enclosure (6m Warranty0 30 Adapters 1 650.00 650.00 650.00 1,500.00 1,500.00
31 1500 Adapters 6 in 1 OTG Card Reader (3m Warranty) 1 450.00 450.00 450.00 800.00 800.00
32 1223 Adapters 7.1 USB Sound Card New (3m Warranty) 5 280.00 1,400.00 1,400.00 3,750.00 3,750.00
33 1106 Adapters HDMI TO DVI Convertor 2 200.00 400.00 400.00 1,000.00 1,000.00
34 1531 Adapters HMDI to DP Adapter New 4 550.00 2,200.00 2,200.00 3,400.00 3,400.00
35 1530 Adapters Mini HDMI to HDMI Convertor 5 200.00 1,000.00 1,000.00 2,250.00 2,250.00
36 1092 Adapters Motherboard USB Header Aadapter 10 375.00 3,750.00 3,750.00 10,000.00 10,000.00
37 1091 Adapters SATA TO USB Adapter 1 500.00 500.00 500.00 1,000.00 1,000.00
38 1107 Adapters VGA TO DVI Convertor 7 200.00 1,400.00 1,400.00 3,150.00 3,150.00
39 1033 Adapters VGA to HDMI Adapter with Audio (Box) 5 1,000.00 5,000.00 5,000.00 8,750.00 8,750.00
1455 DELL EMC Power Edge T40 Intel Xeon 2224G BareBone (3m Warranty) 40 Branded PC 1 9,000.00 9,000.00 9,000.00 14,500.00 14,500.00
1457 DELL OPTIPLEX 3020 I3 4th Gen PC Barebone (3m Warranty) 41 Branded PC 0 8,250.00 0.00 0.00 0.00 0.00
1213 DELL OPTIPLEX 390 i5 2nd Gen 4GB/500GB Desktop PC Used (3m Warranty) 42 Branded PC 0 12,500.00 0.00 0.00 0.00 0.00
1446 Dell Microtower i3 4th Gen 4/500 Mini PC Used (3m Warranty) 43 Branded PC 0 12,750.00 0.00 0.00 0.00 0.00
1458 HP Compaq 6200 Pro 2nd Gen PC Barebone (3m Warranty) 44 Branded PC 1 5,500.00 5,500.00 5,500.00 8,500.00 8,500.00
1580 Packard Bell iMedia S2984 PC 4GB DDR3/500GB HDD (3 months warranty) 45 Branded PC 0 7,500.00 0.00 0.00 0.00 0.00
1586 SAMSUNG i3 2nd Gen (H61) PC 4GB/500HDD (3m warranty) 46 Branded PC 0 11,000.00 0.00 0.00 0.00 0.00
1214 TG I5 4th Gen 4GB/500GB Desktop PC Used (3m Warranty) 47 Branded PC 0 17,500.00 0.00 0.00 0.00 0.00

=== PAGE 3 ===
1217 4G Dual Lens 2MP V380 CCTV Camera New (6m Warranty) 48 CAMERA -2 4,558.33 -9,116.67 -9,116.67 -11,800.00 -11,800.00
1430 4G Dual Lens 6MP Solar Camera New (6m Warranty) 49 CAMERA 1 9,600.00 9,600.00 9,600.00 11,000.00 11,000.00
1235 4G Dual Lens 8MP V380 CCTV Camera New (6m Warranty) 50 CAMERA 2 5,345.00 10,690.00 10,690.00 13,800.00 13,800.00
1237 4G Triple Lens V380 CCTV 360 Camera New (6m Warranty) 51 CAMERA 0 7,100.00 0.00 0.00 0.00 0.00
1576 4G Triple Lens V380 PRO Camera New - SC33-G (6m Warranty) 52 CAMERA 6 7,083.33 42,500.00 42,500.00 53,400.00 53,400.00
1423 8 Channel Wifi Wireless NVR New (6m Warranty) 53 CAMERA 2 8,000.00 16,000.00 16,000.00 19,000.00 19,000.00
1425 Camera 12V Power Supply New (6m Warranty) 54 CAMERA 0 500.00 0.00 0.00 0.00 0.00
1592 GVTECH Wireless video door phone new (6m Warranty) 55 CAMERA 1 13,750.00 13,750.00 13,750.00 16,900.00 16,900.00
1577 IDIZ Dual lens 4G 2K Outdoor Waterproof CCTV Camera New (6+6m Warranty) 56 CAMERA 5 9,000.00 45,000.00 45,000.00 54,500.00 54,500.00
1502 ITECH TRIPLE LENS WIFI Camera New (6m Warranty) 57 CAMERA 1 7,850.00 7,850.00 7,850.00 8,900.00 8,900.00
1424 Itech 4G Triple Lens 12MP 6K V380 Camera New (6m Warranty) 58 CAMERA 1 7,050.00 7,050.00 7,050.00 8,900.00 8,900.00
1591 Lenvii C500 Barcode Scanner Handheld New (3m Warranty) 59 CAMERA 1 5,750.00 5,750.00 5,750.00 7,000.00 7,000.00
1221 Q-SEE MS-901 HD Webcam with Mic (6m Warranty) 60 CAMERA 1 1,100.00 1,100.00 1,100.00 2,250.00 2,250.00
1238 WIFI Bulb Security Camera (E27) New (3m Warranty) 61 CAMERA 1 1,850.00 1,850.00 1,850.00 3,000.00 3,000.00
1422 WIFI Dual Lens 6MP CCTV Camera New (6m Warranty) 62 CAMERA 3 4,583.33 13,750.00 13,750.00 17,250.00 17,250.00
1360 AOCHTA U3 Gaming Case New (3m Warranty) 63 CASES 1 5,700.00 5,700.00 5,700.00 7,500.00 7,500.00
64 1113 CASES Branded Case Used 11 935.51 10,290.59 10,290.59 16,500.00 16,500.00
1116 Dual Tempered Glass Mid Tower Case Black New (6m Warranty) 65 CASES 5 7,250.00 36,250.00 36,250.00 47,500.00 47,500.00
1115 Dual Tempered Glass Mid Tower Case White New (6m Warranty) 66 CASES 5 7,750.00 38,750.00 38,750.00 49,500.00 49,500.00
1414 FALCON F5022 Black Case New (3m Warranty) 67 CASES 0 3,700.00 0.00 0.00 0.00 0.00
1413 FALCON F5031 Black Gaming Case (3m Warranty) 68 CASES 0 3,700.00 0.00 0.00 0.00 0.00

=== PAGE 4 ===
1415 GOLDEN FIELD SEA VIEW GZ360 PLUS BLACK CASING New (6m Warranty) 69 CASES 1 11,700.00 11,700.00 11,700.00 14,500.00 14,500.00
70 1564 CASES Gamekm White D12 Gaming Case -1 4,600.00 -4,600.00 -4,600.00 -7,000.00 -7,000.00
71 1419 CASES Gaming Used Case 2 3,916.67 7,833.33 7,833.33 9,000.00 9,000.00
1412 Golden Field V01 White Casing New (6m Warranty) 72 CASES 1 4,900.00 4,900.00 4,900.00 6,500.00 6,500.00
1361 JK Pro Balck Gaming Case With 3 Fans New (3m Warranty) 73 CASES 0 13,500.00 0.00 0.00 0.00 0.00
74 1110 CASES Mini Case New 3 2,850.00 8,550.00 8,550.00 10,500.00 10,500.00
1447 RAGEX AQUA Black Case New (6m Warranty) 75 CASES 1 5,000.00 5,000.00 5,000.00 6,500.00 6,500.00
1111 RAGEX AQUA White Case New (6m Warranty) 76 CASES 1 5,200.00 5,200.00 5,200.00 7,000.00 7,000.00
77 1112 CASES RAGEX Pantum Case New (6m Warranty) 1 7,100.00 7,100.00 7,100.00 9,500.00 9,500.00
1108 RAGEX Rainbox Mini Case New (6m Warranty) 78 CASES 4 3,700.00 14,800.00 14,800.00 19,600.00 19,600.00
79 1109 CASES RUIX TAN KE Gaming Case New 0 5,300.00 0.00 0.00 0.00 0.00
80 1224 CASES Ruix Titan Gaming Case New 2 5,300.00 10,600.00 10,600.00 13,000.00 13,000.00
81 1483 CASES VIPER ATX Case New 2 3,750.00 7,500.00 7,500.00 9,500.00 9,500.00
82 1246 CASES Vsheng Gaming Case New (6m Warranty) 2 6,000.00 12,000.00 12,000.00 15,800.00 15,800.00
1565 Core 2 Duo Board+Processor Used (1m Warranty) 83 CPU 0 1,500.00 0.00 0.00 0.00 0.00
84 1572 CPU Core 2 Duo Processor Used (1m Warranty) 0 250.00 0.00 0.00 0.00 0.00
1131 Core I3 2nd Gen Processor Used (3m Warranty) 85 CPU 5 713.10 3,565.50 3,565.50 7,500.00 7,500.00
1132 Core I3 4th Gen Processor Used (3m Warranty) 86 CPU 0 1,201.82 0.00 0.00 0.00 0.00
1226 Core I5 2nd Gen Processor Used (3m Warranty) 87 CPU 3 2,000.00 6,000.00 6,000.00 10,500.00 10,500.00
1459 Core I5 4590 4th Gen Processor Used (3m Warranty) 88 CPU 1 5,900.00 5,900.00 5,900.00 6,900.00 6,900.00
1229 Core I5 4th Gen Processor Used (3m Warranty) 89 CPU 2 4,095.02 8,190.04 8,190.04 11,800.00 11,800.00
1476 Core I5 8th Gen Processor Used (3m Warranty) 90 CPU 1 18,500.00 18,500.00 18,500.00 22,500.00 22,500.00
1133 Core i3 6th Gen Processor Used (3m Warranty) 91 CPU 4 2,125.00 8,500.00 8,500.00 14,000.00 14,000.00
1134 Core i3 7th Gen Processor Used (3m Warranty) 92 CPU 3 2,500.00 7,500.00 7,500.00 13,500.00 13,500.00
1242 Core i3 8th Gen Processor Used (3m Warranty) 93 CPU 1 8,750.00 8,750.00 8,750.00 11,500.00 11,500.00

=== PAGE 5 ===
1477 Core i3 9th Gen Processor Used (3m Warranty) 94 CPU 1 13,000.00 13,000.00 13,000.00 17,500.00 17,500.00
1478 Core i3-10100F 10th Gen Processor Used (3m Warranty) 95 CPU 1 20,000.00 20,000.00 20,000.00 25,000.00 25,000.00
1135 Core i5 2550K OC 2nd Gen Processor Used (3m Warranty) 96 CPU 1 2,650.00 2,650.00 2,650.00 3,750.00 3,750.00
1138 Core i5 3rd Gen Processor Used (3m Warranty) 97 CPU 0 2,500.00 0.00 0.00 0.00 0.00
1219 Core i5 6th Gen Processor Used (3m Warranty) 98 CPU 3 6,050.00 18,150.00 18,150.00 28,500.00 28,500.00
1227 Core i5 7th Gen Processor Used (3m Warranty) 99 CPU 1 5,500.00 5,500.00 5,500.00 12,500.00 12,500.00
1599 Core i5 8400T 8th Gen Processor Used (3m Warranty) 100 CPU 1 13,500.00 13,500.00 13,500.00 17,500.00 17,500.00
1136 Core i5-6600 6th Gen Processor Used (3m Warranty) 101 CPU 3 8,500.00 25,500.00 25,500.00 31,500.00 31,500.00
1137 Core i5-9400F 9th Gen Processor Used (3m Warranty) 102 CPU 1 17,000.00 17,000.00 17,000.00 18,500.00 18,500.00
103 1512 CPU I3 1st gen Processor Used (3m Warranty) 0 400.00 0.00 0.00 0.00 0.00
104 1601 CPU I3 3rd Gen Processor Used (3m Warranty) 0 0.00 0.00 0.00 0.00 0.00
1480 Intel Pentium Gold G4930 9th Gen Processor Usec (3m Warranty) 105 CPU 2 1,500.00 3,000.00 3,000.00 7,000.00 7,000.00
1479 Intel Pentium Gold G5400 8th Gen Processor Usec (3m Warranty) 106 CPU 2 2,500.00 5,000.00 5,000.00 8,000.00 8,000.00
1448 Pentium 2nd Gen Processor Used (1m Warranty) 107 CPU 0 300.00 0.00 0.00 0.00 0.00
1467 Ryzen 5 3600 6-Core Processor Used (3m Warranty) 108 CPU 0 17,500.00 0.00 0.00 0.00 0.00
109 1085 Cables DP 1.8m Cable New 11 587.50 6,462.50 6,462.50 12,100.00 12,100.00
110 1083 Cables HDMI 1.5m 1080P Cable New -1 225.00 -225.00 -225.00 -650.00 -650.00
111 1084 Cables HDMI 3m 1080P Cable New 6 400.00 2,400.00 2,400.00 5,100.00 5,100.00
112 1090 Cables HDMI TO VGA 1.5m Cable 4 400.00 1,600.00 1,600.00 3,400.00 3,400.00
113 1081 Cables Printer Cable 1.5m New 5 150.00 750.00 750.00 2,250.00 2,250.00
114 1086 Cables VGA 1.5m 3+6 Cable New 4 341.67 1,366.67 1,366.67 2,600.00 2,600.00
115 1579 Cables VGA 1.5m 3+6 Cable Used -1 250.00 -250.00 -250.00 -350.00 -350.00
116 1087 Cables VGA 1.5n 3+5 Cable New -1 256.67 -256.67 -256.67 -500.00 -500.00
117 1082 Cables DVI 1.5m Cable New 6 500.00 3,000.00 3,000.00 6,000.00 6,000.00
118 1000 Cables HDMI 1.5m 4K and 2K Cable New 12 441.67 5,300.00 5,300.00 15,000.00 15,000.00
119 1001 Cables HDMI 3m 4K and 2K Cable New 8 450.00 3,600.00 3,600.00 13,200.00 13,200.00
120 1222 Cables Laptop Power Cable New 7 350.00 2,450.00 2,450.00 4,550.00 4,550.00

=== PAGE 6 ===
121 1203 Cables Power Cable New 1.5m 15 349.84 5,247.66 5,247.66 9,750.00 9,750.00
122 1236 Cables Power Cable Used 6 230.59 1,383.53 1,383.53 2,100.00 2,100.00
123 1220 Cables SATA Cables New 947 0.00 0.00 0.00 94,700.00 94,700.00
1032 Type C to HDMI 1.8m 4Kx2K Cable (6m Warranty) 124 Cables 5 800.00 4,000.00 4,000.00 8,750.00 8,750.00
125 1037 Chargers Remax RC-C113 A-M Micro USB Cable 7 350.00 2,450.00 2,450.00 5,250.00 5,250.00
1038 Remax RP-U95 Charger New (6m Warranty) 126 Chargers 8 600.00 4,800.00 4,800.00 9,200.00 9,200.00
1039 Remax RP-W58 Wireless 15W Charger New (6m Warranty) 127 Chargers 3 1,250.00 3,750.00 3,750.00 6,750.00 6,750.00
128 1040 Chargers Remax RC-C120 3in1 Cable 2 800.00 1,600.00 1,600.00 3,000.00 3,000.00
129 1028 Connectors Bluetooth Adapter V5.0 (6m Warranty) 4 350.00 1,400.00 1,400.00 2,800.00 2,800.00
1210 6pin Fan Controller New - 10 ports (6m Warranty) 130 Connectors 6 1,150.00 6,900.00 6,900.00 12,000.00 12,000.00
1244 AC650 Wireless Dual Band USB Adapter New (6m Warranty) 131 Connectors 1 2,150.00 2,150.00 2,150.00 3,750.00 3,750.00
132 1080 Connectors Cat5 RJ45 1.5m Ethernet Cable New 8 100.00 800.00 800.00 2,800.00 2,800.00
133 1079 Connectors Cat5 RJ45 10m Ethernet Cable New 7 300.00 2,100.00 2,100.00 5,250.00 5,250.00
134 1078 Connectors Cat5 RJ45 20m Ethernet Cable New 1 500.00 500.00 500.00 1,250.00 1,250.00
135 1263 Connectors Cat6 1.5m Ethernet Transmission Cable 4 250.00 1,000.00 1,000.00 2,000.00 2,000.00
136 1264 Connectors Cat6 3m Ethernet Transmission Cable 6 350.00 2,100.00 2,100.00 3,900.00 3,900.00
137 1265 Connectors Cat6 5m Ethernet Transmission Cable 3 400.00 1,200.00 1,200.00 2,550.00 2,550.00
138 1597 Connectors Cat6 RJ45 20m Ethernet Cable 3 1,100.00 3,300.00 3,300.00 6,000.00 6,000.00
1489 LB Link 300Mbps WIFI Wireless Adapter (3m Warranty) 139 Connectors 15 325.00 4,875.00 4,875.00 13,500.00 13,500.00
140 1029 Connectors Type C to USB HUB 4 Ports 0 450.00 0.00 0.00 0.00 0.00
141 1491 Connectors USB 2.0 HUB 4 PORTS (3m Warranty) 17 305.00 5,185.00 5,185.00 12,750.00 12,750.00
142 1209 Connectors USB 5V TO Router 12V Cable 7 275.00 1,925.00 1,925.00 5,250.00 5,250.00
1027 WIFI Wireless Adapter 150Mbps (6m Warranty) 143 Connectors -2 525.00 -1,050.00 -1,050.00 -1,700.00 -1,700.00
144 1097 Coolers & Fans HM501 30g Thermal Paste 2 100.00 200.00 200.00 1,100.00 1,100.00
145 1095 Coolers & Fans 1g Thermal Paste 34 30.48 1,036.19 1,036.19 2,720.00 2,720.00
1468 AMD Original CPU Cooler Used (3m Warranty) 146 Coolers & Fans 0 1,000.00 0.00 0.00 0.00 0.00
1026 BAJEAL A200 RGB CPU Cooler New (6m Warranty) 147 Coolers & Fans 6 1,500.00 9,000.00 9,000.00 15,000.00 15,000.00
1204 Bajeal Prism ARGB 5v 3pin Fan New - Black (6m Warranty) 148 Coolers & Fans 10 700.00 7,000.00 7,000.00 12,500.00 12,500.00

=== PAGE 7 ===
1205 Bajeal Prism ARGB 6pin Fan New - Black (6m Warranty) 149 Coolers & Fans 15 650.00 9,750.00 9,750.00 17,250.00 17,250.00
1431 GOLDEN FIELD TJ360 ARGB LIQUID COOLER New (6m Warranty) 150 Coolers & Fans 1 15,500.00 15,500.00 15,500.00 19,500.00 19,500.00
151 1096 Coolers & Fans HY501 30g Thermal Paste 7 150.00 1,050.00 1,050.00 4,550.00 4,550.00
1073 Intel CPU Cooler LGA115X New (6m Warranty) 152 Coolers & Fans 17 650.00 11,050.00 11,050.00 24,650.00 24,650.00
153 1198 Coolers & Fans Intel CPU Cooler Used (1m Warranty) 1 300.00 300.00 300.00 1,000.00 1,000.00
1206 Prism ARGB 6pin Fan New - White (6m Warranty) 154 Coolers & Fans 33 750.00 24,750.00 24,750.00 41,250.00 41,250.00
155 1471 Coolers & Fans RGB Ring Light Controllable Fan 6 350.00 2,100.00 2,100.00 6,000.00 6,000.00
156 1426 Coolers & Fans Single Color Fan -1 400.00 -400.00 -400.00 -750.00 -750.00
1211 Solid Rainbow ARGB Ring Light Fan New - Black (3m Warranty) 157 Coolers & Fans 0 575.00 0.00 0.00 0.00 0.00
1207 Solid Rainbow RGB Fan New - Black (6m Warranty) 158 Coolers & Fans 13 467.56 6,078.26 6,078.26 11,700.00 11,700.00
1212 Solid Rainbow RGB Fan New - White (6m Warranty) 159 Coolers & Fans 13 600.00 7,800.00 7,800.00 13,000.00 13,000.00
160 1098 Coolers & Fans YJ-G300 30g Thermal Paste Gold 10 400.00 4,000.00 4,000.00 13,000.00 13,000.00
1208 Yuhan 6pin ARGB Fan New - Black (6m Warranty) 161 Coolers & Fans 15 575.00 8,625.00 8,625.00 16,500.00 16,500.00
1058 Kingston DDR3 12800 8GB 1600MHz Desktop Ram New (2Y Warranty) 162 DESKTOP RAM NEW 0 2,500.00 0.00 0.00 0.00 0.00
1059 Kingston DDR3 14900 8GB 1866MHz Desktop Ram New (2Y Warranty) 163 DESKTOP RAM NEW 0 2,750.00 0.00 0.00 0.00 0.00
1061 Kingston HyperX DDR3 8GB 1600MHz Desktop Ram New (2Y Warranty) 164 DESKTOP RAM NEW -1 3,250.00 -3,250.00 -3,250.00 -4,500.00 -4,500.00
1062 Kingston HyperX DDR3 8GB 1866MHz Desktop Ram New (2Y Warranty) 165 DESKTOP RAM NEW 0 3,500.00 0.00 0.00 0.00 0.00
1366 Dahua DDR4 8GB 3200MHz Gaming Ram New (3Y Warranty) 166 DESKTOP RAM NEW 0 9,500.00 0.00 0.00 0.00 0.00
1060 Kingston DDR4 8GB 2666MHz Desktop Ram New (2Y Warranty) 167 DESKTOP RAM NEW 0 7,500.00 0.00 0.00 0.00 0.00
1367 Thermaltake DDR4 16GB(8x2) 3200MHZ RGB Ram Kit New (3Y Warranty) 168 DESKTOP RAM NEW 0 24,500.00 0.00 0.00 0.00 0.00
1154 ADATA DDR4 8GB 3200MHz Desktop Ram Used (3m Warranty) 169 DESKTOP RAM USED 0 4,937.50 0.00 0.00 0.00 0.00
1151 Corsair Vengeance LPX DDR4 8GB 2666MHz Ram Used (3m Warranty) 170 DESKTOP RAM USED 0 5,500.00 0.00 0.00 0.00 0.00
1152 Corsair Vengeance LPX DDR4 8GB 3000MHz Ram Used (3m 171 DESKTOP RAM USED 0 7,000.00 0.00 0.00 0.00 0.00

=== PAGE 8 ===
1153 Corsair Vengeance LPX DDR4 8GB 3200MHz Ram Used (3m 172 DESKTOP RAM USED 0 6,500.00 0.00 0.00 0.00 0.00
173 1453 DESKTOP RAM USED DDR2 1GB Ram Used (1m Warranty) 4 212.50 850.00 850.00 3,000.00 3,000.00
1139 DDR2 2GB Desktop Ram Used (1m Warranty) 174 DESKTOP RAM USED 2 475.00 950.00 950.00 2,000.00 2,000.00
1514 DDR3 2GB Desktop Ram Used (3m Warranty) 175 DESKTOP RAM USED 2 500.00 1,000.00 1,000.00 2,500.00 2,500.00
1141 Gaming DDR3 4GB Desktop Ram Used (3m Warranty) 176 DESKTOP RAM USED -1 1,000.00 -1,000.00 -1,000.00 -2,250.00 -2,250.00
1143 Gaming DDR3 8GB 1600MHz Desktop Ram Used (3m Warranty) 177 DESKTOP RAM USED 0 2,250.00 0.00 0.00 0.00 0.00
1144 Gaming DDR3 8GB 1866MHz Desktop Ram Used (3m Warranty) 178 DESKTOP RAM USED 1 2,500.00 2,500.00 2,500.00 4,750.00 4,750.00
1145 Gaming DDR3 8GB 2400MHz Desktop Ram Used (3m Warranty) 179 DESKTOP RAM USED 2 3,000.00 6,000.00 6,000.00 10,200.00 10,200.00
1216 Gaming DDR4 16GB 2XXXMHz Ram Used (3m Warranty) 180 DESKTOP RAM USED 2 12,944.44 25,888.89 25,888.89 39,000.00 39,000.00
1147 Gaming DDR4 4GB 2XXXMHz Desktop Ram Used (3m Warranty) 181 DESKTOP RAM USED 6 3,745.83 22,475.00 22,475.00 28,500.00 28,500.00
1148 Gaming DDR4 8GB 2400/2666MHz Desktop Ram Used (3m Warranty) 182 DESKTOP RAM USED 0 11,500.00 0.00 0.00 0.00 0.00
1150 Gaming DDR4 8GB 3XXXMHz RGB Ram Used (3m Warranty) 183 DESKTOP RAM USED 1 6,875.00 6,875.00 6,875.00 12,500.00 12,500.00
1149 Gaming DDR4 8GB 3XXXMHz Ram Used (3m Warranty) 184 DESKTOP RAM USED 1 9,125.00 9,125.00 9,125.00 12,500.00 12,500.00
1581 Normal DDR3 4GB 1333MHz Desktop Ram Used (3m Warranty) 185 DESKTOP RAM USED 5 750.00 3,750.00 3,750.00 9,000.00 9,000.00
1140 Normal DDR3 4GB 1600MHz Desktop Ram Used (3m Warranty) 186 DESKTOP RAM USED 1 1,068.35 1,068.35 1,068.35 1,900.00 1,900.00
1142 Normal DDR3 8GB 1600MHz Desktop Ram Used (3m Warranty) 187 DESKTOP RAM USED 0 3,058.04 0.00 0.00 0.00 0.00
1462 Normal DDR4 16GB 3200MHz Ram Used (3m Warranty) 188 DESKTOP RAM USED 0 14,500.00 0.00 0.00 0.00 0.00
1146 Normal DDR4 4GB 2XXXMHz Desktop Ram Used (3m Warranty) 189 DESKTOP RAM USED 14 3,312.95 46,381.25 46,381.25 59,500.00 59,500.00
1378 Normal DDR4 8GB 2400/2666MHz Desktop Ram Used (3m Warranty) 190 DESKTOP RAM USED 2 8,636.67 17,273.33 17,273.33 23,000.00 23,000.00
1215 Samsung DDR4 16GB 2666MHz Desktop Ram Used (3m Warranty) 191 DESKTOP RAM USED 0 12,500.00 0.00 0.00 0.00 0.00
1549 FANTECH NOTEBOOK COOLER NC14 NEW (6m Warranty) 192 FANTECH GAMING ACCESSORIES 2 3,000.00 6,000.00 6,000.00 7,800.00 7,800.00

=== PAGE 9 ===
1274 FANTECH NOVA II WGP17 Mini Gaming Controller New (6m Warranty) 193 FANTECH GAMING ACCESSORIES 1 3,500.00 3,500.00 3,500.00 4,900.00 4,900.00
1277 FANTECH P51 WIRED GAMING SET 5 IN 1 NEW (6m Warranty) 194 FANTECH GAMING ACCESSORIES 1 8,500.00 8,500.00 8,500.00 11,000.00 11,000.00
1273 FANTECH SHOOTER II GP13 Gaming Controller New (6m Warranty) 195 FANTECH GAMING ACCESSORIES 0 4,200.00 0.00 0.00 0.00 0.00
1276 FANTECH ATOM61 MK211 60% KEY Mechanical Keyboard New (6m Warranty) 196 FANTECH KEYBOARD 0 3,650.00 0.00 0.00 0.00 0.00
1275 FANTECH K515s SHIKARI S Gaming Keyboard New (6m Warranty) 197 FANTECH KEYBOARD 1 2,450.00 2,450.00 2,450.00 3,500.00 3,500.00
1270 FANTECH CRYPTO II VX7V2 Gaming Mouse New (6m Warranty) 198 FANTECH MOUSE 1 2,500.00 2,500.00 2,500.00 3,250.00 3,250.00
1568 FANTECH KANTANA VX9 Gaming Mouse New (6m Warranty) 199 FANTECH MOUSE 1 1,750.00 1,750.00 1,750.00 3,000.00 3,000.00
1548 FANTECH RAIGOR II WG10 Gaming Mouse New (6m Warranty) 200 FANTECH MOUSE 1 2,150.00 2,150.00 2,150.00 3,250.00 3,250.00
1268 FANTECH RAIGOR III WG12 Wireless Gaming Mouse New (6m Warranty) 201 FANTECH MOUSE 1 2,150.00 2,150.00 2,150.00 2,750.00 2,750.00
1269 FANTECH THOR X9 Gaming Mouse New (6m Warranty) 202 FANTECH MOUSE 1 2,750.00 2,750.00 2,750.00 3,500.00 3,500.00
1267 FANTECH VENOM II VIBE WGC2 Wireless Gaming Mouse New (6m Warranty) 203 FANTECH MOUSE 1 3,800.00 3,800.00 3,800.00 4,900.00 4,900.00
1398 FANTECH HQ54 MARS II GAMING HEADSET NEW (6m Warranty) 204 FANTECH SPEAKERS & HEADPHONES 1 2,400.00 2,400.00 2,400.00 3,250.00 3,250.00
1400 FANTECH HQ55 PORTAL 3.5MM HEADSET New (6m Warranty) 205 FANTECH SPEAKERS & HEADPHONES 1 3,450.00 3,450.00 3,450.00 4,750.00 4,750.00
1272 FANTECH NERABOX BS153 3-Way Connectivity BT Speaker New (6m Warranty) 206 FANTECH SPEAKERS & HEADPHONES 1 2,400.00 2,400.00 2,400.00 3,500.00 3,500.00
1271 FANTECH NERABOX BS155 Bluetooth Speaker New (6m Warranty) 207 FANTECH SPEAKERS & HEADPHONES 0 1,910.00 0.00 0.00 0.00 0.00
1399 FANTECH TONE II HQ56 WIRED GAMING HEADSET New (6m Warranty) 208 FANTECH SPEAKERS & HEADPHONES 1 2,000.00 2,000.00 2,000.00 3,000.00 3,000.00
1190 AMD R9 370 4GB Graphics Card Used (3m Warranty 209 Graphics Card 0 17,500.00 0.00 0.00 0.00 0.00
1191 AMD R9 380 4GB Graphics Card Used (3m Warranty 210 Graphics Card 1 16,500.00 16,500.00 16,500.00 20,000.00 20,000.00
1573 AMD RX460 4GB Graphics Card Used (3m Warranty) 211 Graphics Card 1 18,500.00 18,500.00 18,500.00 23,500.00 23,500.00
1192 AMD RX580 8GB Graphics Card Used (3m Warranty) 212 Graphics Card -1 23,500.00 -23,500.00 -23,500.00 -32,500.00 -32,500.00

=== PAGE 10 ===
1394 Asus/Gigabyte Z97/H97 Gaming Motherboard Used (3m Warranty) 213 Graphics Card 0 6,500.00 0.00 0.00 0.00 0.00
1228 GT 740 2GB Graphics Card Used (3m Warranty) 214 Graphics Card 1 5,000.00 5,000.00 5,000.00 6,500.00 6,500.00
1554 GT1030 4GB Graphics Card Used (3m Warranty) 215 Graphics Card 1 3,500.00 3,500.00 3,500.00 7,500.00 7,500.00
1187 GT610 1GB GDDR3 Graphics Card Used (3m Warranty) 216 Graphics Card 0 2,750.00 0.00 0.00 0.00 0.00
1241 GTX 750 2GB Graphics Card Used (3m Warranty) 217 Graphics Card 0 11,250.00 0.00 0.00 0.00 0.00
1391 GTX 760 2GB Graphics Card Used (3m Warranty) 218 Graphics Card 0 11,750.00 0.00 0.00 0.00 0.00
1440 GTX 960 4GB Graphics Card Used (3m Warranty) 219 Graphics Card 1 21,500.00 21,500.00 21,500.00 26,500.00 26,500.00
1441 GTX 970 4GB Graphics Card Used (3m warranty) 220 Graphics Card 1 21,500.00 21,500.00 21,500.00 27,500.00 27,500.00
1393 GTX650 1GB Graphics Card Used (3m Warranty) 221 Graphics Card 2 4,750.00 9,500.00 9,500.00 15,800.00 15,800.00
1189 GTX660 2GB Graphics Card Used (3m Warranty) 222 Graphics Card 2 10,500.00 21,000.00 21,000.00 27,000.00 27,000.00
1392 GTX950 2GB Graphics Card Used (3m Warranty) 223 Graphics Card 0 14,000.00 0.00 0.00 0.00 0.00
1188 Galax GTX 660 3GB Graphics Card Used (3m Warranty) 224 Graphics Card 0 10,750.00 0.00 0.00 0.00 0.00
1574 Galaxy GTX 1060 5GB Graphics Card Used (3m Warranty) 225 Graphics Card 0 33,000.00 0.00 0.00 0.00 0.00
1542 Gigabyte GTX 760 2GB Triple fan OC Graphics Card Used (3m Warranty) 226 Graphics Card 0 11,500.00 0.00 0.00 0.00 0.00
1257 RX560XT 8GB Graphics Card Used (3m Warranty) 227 Graphics Card 1 23,000.00 23,000.00 23,000.00 29,000.00 29,000.00
1258 XFX RX590 GME Graphics Card Used (3m Warranty) 228 Graphics Card 1 30,000.00 30,000.00 30,000.00 38,500.00 38,500.00
1249 2TB Desktop Hard Disk Refurbished (3m Warranty) 229 HDD 6 8,657.14 51,942.86 51,942.86 75,000.00 75,000.00
1513 320GB Desktop Hard disk Used (3m Warranty) 230 HDD 0 2,000.00 0.00 0.00 0.00 0.00
1250 3TB Desktop Hard Disk Refurbished (3m Warranty) 231 HDD 0 11,500.00 0.00 0.00 0.00 0.00
1156 500GB DESKTOP HARD DISK Refurbished (3m Warranty) 232 HDD 6 2,619.73 15,718.39 15,718.39 25,500.00 25,500.00
1584 Branded 160GB Laptop Hard disk 2.5 inch Used (3m Warranty) 233 HDD 1 500.00 500.00 500.00 1,700.00 1,700.00

=== PAGE 11 ===
1248 Branded 1TB Desktop Hard Disk Used (3m Warranty) 234 HDD 7 5,657.14 39,600.00 39,600.00 63,000.00 63,000.00
1420 Branded 1TB Laptop Hard disk 2.5 inch Used (3m Warranty) 235 HDD 0 5,250.00 0.00 0.00 0.00 0.00
1375 Branded 250GB Laptop Hard disk 2.5 inch Used (3m Warranty) 236 HDD 1 1,650.00 1,650.00 1,650.00 2,500.00 2,500.00
1376 Branded 320GB Laptop Hard disk 2.5 inch Used (3m Warranty) 237 HDD -1 1,750.00 -1,750.00 -1,750.00 -3,250.00 -3,250.00
1155 Branded 500GB Laptop Hard disk 2.5 inch Used (3m Warranty) 238 HDD 10 3,716.56 37,165.63 37,165.63 45,000.00 45,000.00
1377 Branded 750GB Laptop Hard disk 2.5 inch Used (3m Warranty) 239 HDD 1 4,750.00 4,750.00 4,750.00 6,750.00 6,750.00
1002 A2 Gaming Headphone with Mic (6m Warranty) 240 Headphones & Speakers 3 750.00 2,250.00 2,250.00 5,250.00 5,250.00
1003 BAJEAL G18 7.1 Gaming Headphone (1Y Warranty) 241 Headphones & Speakers 1 1,650.00 1,650.00 1,650.00 3,250.00 3,250.00
1004 P9 Pro Max Wireless Headphone (6m Warranty 242 Headphones & Speakers 5 900.00 4,500.00 4,500.00 9,250.00 9,250.00
1493 HOTMAI A555 Multimedia Speaker RGB (3m Warranty) 243 Headphones & Speakers -1 943.75 -943.75 -943.75 -1,750.00 -1,750.00
244 1024 Headphones & Speakers HUIAI Mini USB Speaker (6m Warranty) 10 500.00 5,000.00 5,000.00 10,000.00 10,000.00
1494 KISONLI A606 USB Speakers New (3m Warranty) 245 Headphones & Speakers 1 687.50 687.50 687.50 1,500.00 1,500.00
1025 YSD 1046 Mini Digital Speaker (6m Warranty) 246 Headphones & Speakers 0 900.00 0.00 0.00 0.00 0.00
247 1582 Items lIst 1 Hadhiya change 1 385.00 385.00 385.00 0.00 0.00
1005 AOC KM210 Wireless Keyboard and Mouse New (6m Warranty) 248 Keyboard & Mouse 6 2,250.00 13,500.00 13,500.00 25,500.00 25,500.00
1018 BAJEAL G5 Gaming Mouse New (6m Warranty) 249 Keyboard & Mouse 3 1,250.00 3,750.00 3,750.00 4,500.00 4,500.00
1007 BAJEAL K1800 USB keyboard New (6m Warranty) 250 Keyboard & Mouse 9 750.00 6,750.00 6,750.00 13,500.00 13,500.00
1009 BAJEAL K35 Gaming RGB Keyboard New (6m Warranty) 251 Keyboard & Mouse 1 1,000.00 1,000.00 1,000.00 1,650.00 1,650.00
252 1021 Keyboard & Mouse XI Wireless Mouse New (6m Warranty) 2 1,050.00 2,100.00 2,100.00 2,500.00 2,500.00
1020 AOC MS121 Optical Wired Mouse (6m Warranty) 253 Keyboard & Mouse -1 425.00 -425.00 -425.00 -1,000.00 -1,000.00
1011 BAJEAL K1000 USB Mini Keyboard (6m Warranty) 254 Keyboard & Mouse 4 850.00 3,400.00 3,400.00 6,000.00 6,000.00
1017 Bajeal D1 Gaming Mouse New (6m Warranty) 255 Keyboard & Mouse 4 1,050.00 4,200.00 4,200.00 5,000.00 5,000.00

=== PAGE 12 ===
1022 Bajeal T350 Keyboard and Mouse Gaming Combo (6m Warranty) 256 Keyboard & Mouse 6 1,600.00 9,600.00 9,600.00 15,000.00 15,000.00
1023 Bajeal T450 Keyboard and Mouse Gaming Combo (6m Warranty) 257 Keyboard & Mouse 6 1,900.00 11,400.00 11,400.00 17,400.00 17,400.00
258 1243 Keyboard & Mouse Branded Keyboard Used (1m Warranty) 1 559.23 559.23 559.23 1,250.00 1,250.00
259 1397 Keyboard & Mouse Branded Mouse Used (1m Warranty) 17 504.40 8,574.73 8,574.73 16,150.00 16,150.00
1012 DELL KB-218 Wired Business Keyboard New (6m Warranty) 260 Keyboard & Mouse 8 850.00 6,800.00 6,800.00 14,000.00 14,000.00
1487 DELL Original Wired Slim Keyboard New (1Y Warranty) 261 Keyboard & Mouse 4 1,200.00 4,800.00 4,800.00 9,000.00 9,000.00
1475 Dell WM126 Wireless Mouse New (6m Warranty) 262 Keyboard & Mouse 3 1,300.00 3,900.00 3,900.00 6,750.00 6,750.00
1014 HP GK100F Mechanical Gaming Keyboard Blue Switch (1Y Warranty) 263 Keyboard & Mouse 3 3,700.00 11,100.00 11,100.00 16,500.00 16,500.00
264 1015 Keyboard & Mouse HP H100 Gaming Headset (1Y Warranty) 3 2,000.00 6,000.00 6,000.00 10,500.00 10,500.00
1013 HP K1600 Wired Businiess Keyboard New (6m Warranty) 265 Keyboard & Mouse 8 850.00 6,800.00 6,800.00 14,000.00 14,000.00
1008 JADEL GK106 Gaming Keyboard & Mouse New (6m Warranty) 266 Keyboard & Mouse 0 2,000.00 0.00 0.00 0.00 0.00
1010 JADEL K32 Gaming Keyboard New (6m Warranty) 267 Keyboard & Mouse 0 1,750.00 0.00 0.00 0.00 0.00
1490 JADEL W690 Wireless Mouse New (3m Warranty) 268 Keyboard & Mouse 8 375.00 3,000.00 3,000.00 10,000.00 10,000.00
1245 Jadel 220 Optical USB Mouse New (3m Warranty) 269 Keyboard & Mouse 1 250.00 250.00 250.00 550.00 550.00
1016 Logitech M220 Silent Wireless Mouse (6m Warranty) 270 Keyboard & Mouse 3 775.00 2,325.00 2,325.00 4,650.00 4,650.00
1470 Meetion R547 Wireless Mouse New (6m Warranty) 271 Keyboard & Mouse 1 900.00 900.00 900.00 1,500.00 1,500.00
272 1364 Keyboard & Mouse OP-10 Office Mouse New (3m Warranty) 1 350.00 350.00 350.00 750.00 750.00
1006 Philips C234 Wired Keyboard and Mouse (6m Warranty) 273 Keyboard & Mouse 1 1,300.00 1,300.00 1,300.00 2,000.00 2,000.00
1019 Philips SPK9314 3-Button Wired Gaming Mouse New (6m Warranty) 274 Keyboard & Mouse 3 750.00 2,250.00 2,250.00 5,250.00 5,250.00
1365 VIPER EK01 3 Language Keyboard New (3m Warranty) 275 Keyboard & Mouse 2 850.00 1,700.00 1,700.00 3,200.00 3,200.00
276 1496 Keyboard & Mouse W410 Optical Mouse New (3m Warranty) 8 235.00 1,880.00 1,880.00 5,200.00 5,200.00
1492 Wireless Mini Keyboard and Mouse GKM901 (3m Warranty) 277 Keyboard & Mouse 0 1,250.00 0.00 0.00 0.00 0.00
1571 iMICE AK600 Gaming Keyboard New (6m Warranty) 278 Keyboard & Mouse 2 2,000.00 4,000.00 4,000.00 5,000.00 5,000.00

=== PAGE 13 ===
1066 Kingston DDR4 16GB 3200MHz Laptop Ram New (2Y Warranty) 279 LAPTOP RAM NEW 0 12,500.00 0.00 0.00 0.00 0.00
1067 Kingston DDR4 8GB 2400MHz Laptop Ram New (2Y Warranty) 280 LAPTOP RAM NEW 0 7,000.00 0.00 0.00 0.00 0.00
1068 Kingston DDR4 8GB 3200MHz Laptop Ram New (2Y Warranty) 281 LAPTOP RAM NEW 0 7,500.00 0.00 0.00 0.00 0.00
1069 Kingston PC3 8GB 1600MHz Laptop Ram New (2Y Warranty) 282 LAPTOP RAM NEW 3 3,000.00 9,000.00 9,000.00 13,500.00 13,500.00
1070 Kingston PC3L 8GB 1600MHz Laptop Ram New (2Y Warranty) 283 LAPTOP RAM NEW 1 3,200.00 3,200.00 3,200.00 4,750.00 4,750.00
1072 ADATA 16GB 3200MHZ Laptop Ram New (3m Warranty) 284 LAPTOP RAM NEW 2 17,500.00 35,000.00 35,000.00 53,000.00 53,000.00
1063 HyperX DDR4 16GB 2400MHz Laptop Gaming Ram New (3Y Warranty) 285 LAPTOP RAM NEW 3 12,500.00 37,500.00 37,500.00 72,000.00 72,000.00
1064 HyperX DDR4 16GB 2666MHz Laptop Gaming Ram New (3Y Warranty) 286 LAPTOP RAM NEW 1 13,500.00 13,500.00 13,500.00 25,000.00 25,000.00
1065 HyperX DDR4 8GB 2666MHz Laptop Gaming Ram New (3Y Warranty) 287 LAPTOP RAM NEW 0 7,500.00 0.00 0.00 0.00 0.00
1071 Transcend 16GB DDR5 4800MHz Laptop Ram NEW (3Y Warranty) 288 LAPTOP RAM NEW 0 20,000.00 0.00 0.00 0.00 0.00
1157 Branded PC3L 4GB Laptop Ram Used (3m Warranty) 289 LAPTOP RAM USED 8 989.84 7,918.75 7,918.75 14,000.00 14,000.00
1240 Branded PC3L 8GB Laptop Ram Used (3m Warranty) 290 LAPTOP RAM USED 9 3,438.10 30,942.86 30,942.86 35,100.00 35,100.00
1418 Branded PC4 16GB 2666MHz Laptop Ram Used (3m Warranty) 291 LAPTOP RAM USED 0 11,000.00 0.00 0.00 0.00 0.00
1159 Branded PC4 4GB 2133MHz Laptop Ram Used (3m Warranty) 292 LAPTOP RAM USED 2 4,850.00 9,700.00 9,700.00 13,000.00 13,000.00
1563 Branded PC4 4GB 2666MHz Laptop Ram Used (3m Warranty) 293 LAPTOP RAM USED 1 3,500.00 3,500.00 3,500.00 6,900.00 6,900.00
1160 Branded PC4 8GB 2400MHz Laptop Ram Used (3m Warranty) 294 LAPTOP RAM USED 2 6,000.00 12,000.00 12,000.00 21,000.00 21,000.00
1161 Branded PC4 8GB 2666MHz Laptop Ram Used (3m Warranty) 295 LAPTOP RAM USED 0 8,033.33 0.00 0.00 0.00 0.00
1374 Samsung PC3 2GB Laptop Ram Used (3m Warranty) 296 LAPTOP RAM USED 3 400.00 1,200.00 1,200.00 3,000.00 3,000.00
1158 Samsung PC3 4GB Laptop Ram Used (3m Warranty) 297 LAPTOP RAM USED 8 972.22 7,777.78 7,777.78 14,000.00 14,000.00
298 1427 Laptop Accessories Dell Laptop Charging Port 0 900.00 0.00 0.00 0.00 0.00
1569 EGOSTAND Cooling Pad New (3m Warranty) 299 Laptop Accessories 3 1,775.00 5,325.00 5,325.00 7,500.00 7,500.00
300 1371 Laptop Accessories Laptop Back pack 0 0.00 0.00 0.00 0.00 0.00

=== PAGE 14 ===
301 1370 Laptop Accessories Laptop Bag 3 1,350.00 4,050.00 4,050.00 6,750.00 6,750.00
302 1570 Laptop Accessories N99 Cooling Pad New (3m Warranty) 2 2,383.33 4,766.67 4,766.67 7,000.00 7,000.00
303 1383 Laptop Accessories Thermal Grease LK-15 3 600.00 1,800.00 1,800.00 4,500.00 4,500.00
304 1442 Laptop Accessories Toshibs C50 Speakers 0 2,000.00 0.00 0.00 0.00 0.00
1342 ASUS X555 A+ Laptop Battery (6m Warranty) 305 Laptop Batteries 1 6,000.00 6,000.00 6,000.00 7,900.00 7,900.00
1343 ASUS X556 A+ Laptop Battery (6m Warranty) 306 Laptop Batteries 1 6,000.00 6,000.00 6,000.00 7,900.00 7,900.00
1350 Acer Aspire E5-575 16A5K A+ Laptop Battery (6m Warranty) 307 Laptop Batteries 1 7,000.00 7,000.00 7,000.00 8,900.00 8,900.00
1351 Acer Aspire V5-471G A+ Laptop Battery (6m Warranty) 308 Laptop Batteries 1 6,800.00 6,800.00 6,800.00 8,750.00 8,750.00
1333 Dell Inspiron 3521 40W A+ Laptop Battery New (6m Warranty) 309 Laptop Batteries 2 6,000.00 12,000.00 12,000.00 16,000.00 16,000.00
1334 Dell Inspiron 3521 65W A Laptop Battery New (6m Warranty) 310 Laptop Batteries 1 5,800.00 5,800.00 5,800.00 7,750.00 7,750.00
1332 Dell Inspiron 4010 5010 Laptop Battery New (6m Warranty) 311 Laptop Batteries 1 4,500.00 4,500.00 4,500.00 6,500.00 6,500.00
1335 Dell Inspiron M5Y1K 3451 A+ Laptop Battery New (6m Warranty) 312 Laptop Batteries 2 5,866.67 11,733.33 11,733.33 15,000.00 15,000.00
1336 Dell Inspiron WDX0R Laptop Battery New (6m Warranty) 313 Laptop Batteries 1 7,000.00 7,000.00 7,000.00 8,900.00 8,900.00
1344 HP Compaq CQ42 A+ Laptop Battery (6m Warranty) 314 Laptop Batteries 1 6,000.00 6,000.00 6,000.00 7,900.00 7,900.00
1346 HP Pavilion HS04 A+ Laptop Battery (6m Warranty) 315 Laptop Batteries 1 5,800.00 5,800.00 5,800.00 7,750.00 7,750.00
1347 HP Pavilion HT03XL A+ Laptop Battery (6m Warranty) 316 Laptop Batteries 1 6,900.00 6,900.00 6,900.00 8,750.00 8,750.00
1349 HP Pavilion LA04 Laptop Battery (6m Warranty) 317 Laptop Batteries 1 4,800.00 4,800.00 4,800.00 6,600.00 6,600.00
1345 HP Pavilion OA04 Laptop Battery (6m Warranty) 318 Laptop Batteries 1 4,500.00 4,500.00 4,500.00 6,500.00 6,500.00
1348 HP Pavilion VI04 A+ Laptop Battery (6m Warranty) 319 Laptop Batteries 1 6,000.00 6,000.00 6,000.00 7,900.00 7,900.00
1341 Lenovo Ideapad G480 Laptop Battery (6m Warranty) 320 Laptop Batteries 1 8,700.00 8,700.00 8,700.00 10,500.00 10,500.00
1340 Lenovo Thinkpad T410 Laptop Battery (6m Warranty) 321 Laptop Batteries 1 8,300.00 8,300.00 8,300.00 9,900.00 9,900.00
1339 Toshiba PA5185U Laptop Battery (6m Warranty) 322 Laptop Batteries 1 6,000.00 6,000.00 6,000.00 7,900.00 7,900.00
1338 Toshiba Satellite 3817 Laptop Battery (6m Warranty) 323 Laptop Batteries 1 4,000.00 4,000.00 4,000.00 5,500.00 5,500.00

=== PAGE 15 ===
1337 Toshiba Satellite 5024 Laptop Battery (6m Warranty) 324 Laptop Batteries 1 4,500.00 4,500.00 4,500.00 5,900.00 5,900.00
1286 ACER 315 Laptop Cooling Fan (3m Warranty) 325 Laptop Cooling Fan 1 2,250.00 2,250.00 2,250.00 3,500.00 3,500.00
1287 ACER E5-576 Laptop Cooling Fan (3m Warranty) 326 Laptop Cooling Fan 1 1,800.00 1,800.00 1,800.00 3,000.00 3,000.00
1285 DELL 3521 Laptop Cooling Fan (3m Warranty) 327 Laptop Cooling Fan 1 1,800.00 1,800.00 1,800.00 3,000.00 3,000.00
1284 HP 15AB Laptop Cooling Fan (3m Warranty) 328 Laptop Cooling Fan 1 1,800.00 1,800.00 1,800.00 3,000.00 3,000.00
329 1282 Laptop Cooling Fan HP 15R Laptop Cooling Fan (3m Warranty) 2 1,800.00 3,600.00 3,600.00 6,000.00 6,000.00
1280 HP 15da Laptop Cooling Fan (3m Warranty) 330 Laptop Cooling Fan 2 1,800.00 3,600.00 3,600.00 6,000.00 6,000.00
1288 HP 4420 Laptop Cooling Fan (3m Warranty) 331 Laptop Cooling Fan 1 1,800.00 1,800.00 1,800.00 3,000.00 3,000.00
1279 HP 450 G2 Laptop Cooling Fan (3m Warranty) 332 Laptop Cooling Fan 1 1,800.00 1,800.00 1,800.00 3,000.00 3,000.00
1278 HP 4530 Laptop Cooling Fan (3m Warranty) 333 Laptop Cooling Fan 1 1,800.00 1,800.00 1,800.00 3,000.00 3,000.00
1281 HP 4540S Laptop Cooling Fan (3m Warranty) 334 Laptop Cooling Fan 1 1,800.00 1,800.00 1,800.00 3,000.00 3,000.00
1283 HP G6-1000 Laptop Cooling Fan (3m Warranty) 335 Laptop Cooling Fan 1 1,800.00 1,800.00 1,800.00 3,000.00 3,000.00
1327 ASUS X512 Laptop Keyboard (6m Warranty) 336 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
1328 ASUS X542 Laptop Keyboard (6m Warranty) 337 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
1326 ASUS X555 Laptop Keyboard (6m Warranty) 338 Laptop Keyboards 1 2,150.00 2,150.00 2,150.00 3,200.00 3,200.00
1322 Acer Aspire 4736Z Laptop Keyboard (6m Warranty) 339 Laptop Keyboards 1 1,450.00 1,450.00 1,450.00 2,700.00 2,700.00
1323 Acer Aspire E5-573 Laptop Keyboard (6m Warranty) 340 Laptop Keyboards 1 1,450.00 1,450.00 1,450.00 26,503.00 26,503.00
1324 Acer Swift SF315 (Long) Laptop Keyboard (6m Warranty) 341 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
1325 Acer Swift SF315 (Side) Laptop Keyboard (6m Warranty) 342 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
343 1316 Laptop Keyboards Dell 3501 Laptop Keyboard (6m Warranty) 1 2,000.00 2,000.00 2,000.00 3,250.00 3,250.00
1313 Dell 3521/15R 5521 Laptop Keyboard (6m Warranty) 344 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
345 1314 Laptop Keyboards Dell 3542 Laptop Keyboard (6m Warranty) 1 1,600.00 1,600.00 1,600.00 2,750.00 2,750.00
346 1315 Laptop Keyboards Dell 7566 Laptop Keyboard (6m Warranty) 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00

=== PAGE 16 ===
1309 HP 15-AC / G4 25X Laptop Keyboard (6m Warranty) 347 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
1311 HP 15-BS/ G6 25X Laptop Keyboard (6m Warranty) 348 Laptop Keyboards 1 1,700.00 1,700.00 1,700.00 2,900.00 2,900.00
1310 HP 15-DA/15-DB/15-DX Laptop Keyboard (6m Warranty) 349 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
350 1312 Laptop Keyboards HP 15-X Laptop Keyboard (6m Warranty) 2 1,500.00 3,000.00 3,000.00 5,500.00 5,500.00
1532 HP 840 G3 Laptop Keyboard New (6m Warranty) 351 Laptop Keyboards 0 1,700.00 0.00 0.00 0.00 0.00
1259 HP DV6-6000 Laptop Keyboard (6m Warranty) 352 Laptop Keyboards 1 1,650.00 1,650.00 1,650.00 3,000.00 3,000.00
1308 HP G6-1000 Laptop Keyboard (6m Warranty) 353 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
1319 Lenovo Ideapad 100-15IBY Laptop Keyboard (6m Warranty) 354 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
1320 Lenovo Ideapad 320-15ISK Laptop Keyboard (6m Warranty) 355 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
1318 Lenovo Ideapad G50 Laptop Keyboard (6m Warranty) 356 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
1317 Lenovo Ideapad G500 Laptop Keyboard (6m Warranty) 357 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
1321 Lenovo Thinkpad E531 Laptop Keyboard (6m Warranty) 358 Laptop Keyboards 1 3,000.00 3,000.00 3,000.00 4,000.00 4,000.00
1330 Toshiba Satellite C50 Laptop Keyboard (6m Warranty) 359 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
1329 Toshiba Satellite C660 Laptop Keyboard (6m Warranty) 360 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
1331 Toshiba Satellite C850 Laptop Keyboard (6m Warranty) 361 Laptop Keyboards 1 1,500.00 1,500.00 1,500.00 2,750.00 2,750.00
362 1593 Laptop Power Adapters 12v Power Adapter (3m Warranty) 3 1,000.00 3,000.00 3,000.00 4,500.00 4,500.00
1382 5v 2a (5.5*2.5mm) Power Aadapter (3m Warranty) 363 Laptop Power Adapters 1 800.00 800.00 800.00 1,500.00 1,500.00
1303 Acer 65W 19.5V 3.42A Small Pin Laptop Power Adapter New (6m Warranty) 364 Laptop Power Adapters 1 1,550.00 1,550.00 1,550.00 2,500.00 2,500.00
1302 Acer 65W 19.5V 3.42A Yellow Pin Laptop Power Adapter New (6m Warranty) 365 Laptop Power Adapters 1 1,500.00 1,500.00 1,500.00 2,500.00 2,500.00
1358 Asus 65W 19.5V 3.34A Small Pin Laptop Power Adapter New (6m Warranty) 366 Laptop Power Adapters 1 1,450.00 1,450.00 1,450.00 2,500.00 2,500.00
1301 Asus 65W 19.5V 3.34A Small Pin Laptop Power Brick New (6m Warranty) 367 Laptop Power Adapters 1 2,350.00 2,350.00 2,350.00 3,500.00 3,500.00
1488 Asus 65W 2.5*0.7mm Charger New (6m Warranty) 368 Laptop Power Adapters 1 1,500.00 1,500.00 1,500.00 2,450.00 2,450.00

=== PAGE 17 ===
1433 Dell 45W 19.5V 3.34A Small Pin Laptop Power Adapter New (6m Warranty) 369 Laptop Power Adapters 0 1,500.00 0.00 0.00 0.00 0.00
1298 Dell 65W 19.5V 3.34A Big Pin Laptop Power Adapter New (6m Warranty) 370 Laptop Power Adapters 5 1,502.08 7,510.42 7,510.42 12,500.00 12,500.00
1299 Dell 65W 19.5V 3.34A Small Pin Laptop Power Adapter New (6m Warranty) 371 Laptop Power Adapters 2 1,500.00 3,000.00 3,000.00 5,000.00 5,000.00
1300 Dell 90W 19.5V 4.62A Big Pin Laptop Power Adapter New (6m Warranty) 372 Laptop Power Adapters 0 1,700.00 0.00 0.00 0.00 0.00
1460 Dell 90W 19.5V 4.62A Small Pin Laptop Power Adapter New (6m Warranty) 373 Laptop Power Adapters 2 1,650.00 3,300.00 3,300.00 0.00 0.00
1307 Dell Type C Laptop Power Adapter New (6m Warranty) 374 Laptop Power Adapters 3 2,500.00 7,500.00 7,500.00 11,700.00 11,700.00
1293 HP 45W 19.5V 2.37A Blue Pin Laptop Power Adapter New (6m Warranty) 375 Laptop Power Adapters 1 1,500.00 1,500.00 1,500.00 2,500.00 2,500.00
1297 HP 65W 19.5V 3.34A Big Pin Laptop Power Adapter New (6m Warranty) 376 Laptop Power Adapters 1 1,500.00 1,500.00 1,500.00 2,500.00 2,500.00
1294 HP 65W 19.5V 3.34A Blue Pin Laptop Power Adapter New (6m Warranty) 377 Laptop Power Adapters 3 1,500.00 4,500.00 4,500.00 7,500.00 7,500.00
1296 HP 90W 19.5V 4.62A Big Pin Laptop Power Adapter New (6m Warranty) 378 Laptop Power Adapters 1 1,700.00 1,700.00 1,700.00 2,800.00 2,800.00
1295 HP 90W 19.5V 4.62A Blue Pin Laptop Power Adapter New (6m Warranty) 379 Laptop Power Adapters 1 1,650.00 1,650.00 1,650.00 2,800.00 2,800.00
1306 HP Type C Laptop Power Adapter New (6m Warranty) 380 Laptop Power Adapters 1 2,150.00 2,150.00 2,150.00 3,600.00 3,600.00
381 1380 Laptop Power Adapters LG 90W Laptop Charger (6m Warranty) 1 1,650.00 1,650.00 1,650.00 2,750.00 2,750.00
1290 Lenovo 45W Small Pin Laptop Power Brick New (6m Warranty) 382 Laptop Power Adapters 0 2,300.00 0.00 0.00 0.00 0.00
1292 Lenovo 65W 20V 3.25A Big Pin Laptop Power Adapter New (6m Warranty) 383 Laptop Power Adapters 1 1,500.00 1,500.00 1,500.00 2,500.00 2,500.00
1291 Lenovo 65W 20V 3.25A Brown Pin Laptop Power Adapter New (6m Warranty) 384 Laptop Power Adapters 1 1,500.00 1,500.00 1,500.00 2,500.00 2,500.00
1289 Lenovo 65W 20V 3.25A USB Pin Laptop Power Adapter New (6m Warranty) 385 Laptop Power Adapters 1 1,500.00 1,500.00 1,500.00 2,500.00 2,500.00
1305 Lenovo Type C Laptop Power Adapter New (6m Warranty) 386 Laptop Power Adapters 3 2,500.00 7,500.00 7,500.00 11,700.00 11,700.00
387 1381 Laptop Power Adapters Sony 90W Laptop Charger (6m Warranty) 1 1,650.00 1,650.00 1,650.00 2,750.00 2,750.00
1304 Toshiba 65W 19.5V 3.42 Laptop Power Adapter New (6m Warranty) 388 Laptop Power Adapters 0 1,500.00 0.00 0.00 0.00 0.00
1363 14 Inch 30 pin FHD IPS Lap Screen With Bracket (6m Warranty) 389 Laptop Screens 1 11,200.00 11,200.00 11,200.00 13,500.00 13,500.00
1356 14 Inch 30 pin Slim FHD Lap Screen With Bracket (6m Warranty) 390 Laptop Screens 1 9,250.00 9,250.00 9,250.00 12,250.00 12,250.00

=== PAGE 18 ===
1357 14 Inch 40 pin Normal refurbished Lap Screen (6m Warranty) 391 Laptop Screens 2 6,287.50 12,575.00 12,575.00 15,800.00 15,800.00
1461 14 Inch 40 pin Slim refurbished Lap Screen (6m Warranty) 392 Laptop Screens 2 6,750.00 13,500.00 13,500.00 17,000.00 17,000.00
1403 14 inch 30pin FHD IPS Box Square Display New (6m Warranty) 393 Laptop Screens 0 15,000.00 0.00 0.00 0.00 0.00
1354 15.6 Inch 30 pin Narrow FHD Lap Screen Without Bracket (6m Warranty) 394 Laptop Screens 1 9,550.00 9,550.00 9,550.00 12,500.00 12,500.00
1353 15.6 Inch 30 pin Slim FHD IPS Lap Screen Without Bracket (6m Warranty) 395 Laptop Screens 2 9,800.00 19,600.00 19,600.00 25,000.00 25,000.00
1355 15.6 Inch 30 pin Slim Normal Size FHD IPS Lap Screen (6m Warranty) 396 Laptop Screens 1 10,500.00 10,500.00 10,500.00 12,750.00 12,750.00
1352 15.6 Inch 40 Pin Normal Refusbished Lap Screen (6m Warranty) 397 Laptop Screens 3 7,500.00 22,500.00 22,500.00 28,500.00 28,500.00
1550 15.6 Inch 40 Pin Normal Refusbished Lap Screen slim (6m Warranty) 398 Laptop Screens 1 8,400.00 8,400.00 8,400.00 10,500.00 10,500.00
1515 Dell Inspion 1420 core 2 duo 1GB RAM 320GB HDD Laptop (1m Warranty) 399 Laptops 1 4,000.00 4,000.00 4,000.00 9,500.00 9,500.00
1454 Dell Inspiron 1545 Intel Pentium 3GB Ram 160GB HDD Laptop 400 Laptops 0 6,000.00 0.00 0.00 0.00 0.00
1463 Delll Latitude 5490 i5 7th gen 8GB RAM 256GB SSD Used Laptop (3m Warranty) 401 Laptops 0 50,000.00 0.00 0.00 0.00 0.00
1372 HP 13.3" Elitebook 735 G5 Ryzen 3 Pro 8GB Ram Laptop (3m Warranty) 402 Laptops 1 55,000.00 55,000.00 55,000.00 72,000.00 72,000.00
1373 HP 13.3" Elitebook 735 G6 Ryzen 5 8GB Ram Laptop (3m Warranty) 403 Laptops 0 65,000.00 0.00 0.00 0.00 0.00
1445 HP Elitebook 835 G7 i5 10th Gen 16/512 Used (3m Warranty) 404 Laptops 1 95,000.00 95,000.00 95,000.00 110,000.00 110,000.00
1583 HP Elitebook 8470P i5 2nd Gen 8 GB/ 500 HDD (3 months warranty) 405 Laptops 0 13,000.00 0.00 0.00 0.00 0.00
1556 HP MINI Intel Atom 2/160GB Laptop Used (2W Warranty) 406 Laptops 0 9,000.00 0.00 0.00 0.00 0.00
1417 HP Probook 440 G7 I5 8th Gen 8GB RAM 256GB NVMe SSD Used (3m Warranty) 407 Laptops 1 66,500.00 66,500.00 66,500.00 0.00 0.00
1416 HP Probook 640 G5 I5 8th Gen 8GB RAM 256GB NVMe SSD Used (3m Warranty) 408 Laptops 0 66,500.00 0.00 0.00 0.00 0.00
1255 Lenovo IdeaPad Slim 1 Ryzen 5 7250U 8GB Ram 512GB NVMe Used (3m Warranty) 409 Laptops 0 100,000.00 0.00 0.00 0.00 0.00
1411 Lenovo Thinkpad X1 Carbon i5 8th Gen 8GB RAM 256GB NVME Laptop Used (3m Warranty) 410 Laptops 0 66,500.00 0.00 0.00 0.00 0.00

=== PAGE 19 ===
1053 Kingston A400 120GB M.2 NGFF SSD New (3Y Warranty) 411 M.2 NGFF NEW 2 3,500.00 7,000.00 7,000.00 11,800.00 11,800.00
1054 Kingston A400 240GB M.2 NGFF SSD New (3Y Warranty) 412 M.2 NGFF NEW 1 5,250.00 5,250.00 5,250.00 8,900.00 8,900.00
1055 Kingston NV1 / A2000 250GB NVMe SSD New (3Y Warranty) 413 M.2 NVMe NEW 0 6,500.00 0.00 0.00 0.00 0.00
1057 MEMOBOSS 128GB NVMe 3.0 SSD New (3Y Warranty) 414 M.2 NVMe NEW 0 3,750.00 0.00 0.00 0.00 0.00
1056 Kingston NV1 / A2000 500GB NVMe SSD New (3Y Warranty) 415 M.2 NVMe NEW 0 10,000.00 0.00 0.00 0.00 0.00
1129 Branded 128GB M.2 SATA SSD Used (3m Warranty) 416 M.2 USED 4 3,958.33 15,833.33 15,833.33 21,000.00 21,000.00
1130 Branded 256GB M.2 SATA SSD Used (3m Warranty) 417 M.2 USED 0 8,500.00 0.00 0.00 0.00 0.00
418 1551 M.2 USED MSATA 128GB SSD Used (3m Warranty) 1 2,000.00 2,000.00 2,000.00 3,500.00 3,500.00
419 1553 M.2 USED MSATA 32GB SSD Used (1m Warranty) 1 0.00 0.00 0.00 500.00 500.00
1410 DELL OPTIPLEX 3040 6th gen Mini PC Barebone (3m Warranty) 420 MINI PC 0 9,000.00 0.00 0.00 0.00 0.00
1369 HP Prodesk 400 G5 SFF 8th Gen Barebone Used (3m Warranty) 421 MINI PC 1 15,000.00 15,000.00 15,000.00 19,000.00 19,000.00
1379 Lenovo Ideacentre 510S 9th Gen Barebone Used (3m Warranty) 422 MINI PC 1 15,000.00 15,000.00 15,000.00 19,500.00 19,500.00
1538 17 inch LCD BOX Monitor Used (3m Warranty) 423 Monitors 1 3,500.00 3,500.00 3,500.00 4,900.00 4,900.00
1421 19 INCH BOX LCD Monitor Used (3m Warranty) 424 Monitors 1 3,875.00 3,875.00 3,875.00 6,500.00 6,500.00
1256 19 inch BOX LED Monitor Used (3m Warranty) 425 Monitors 0 6,100.00 0.00 0.00 0.00 0.00
426 1456 Monitors AOC 14 inch Monitor Used (1m Warranty) 1 1,000.00 1,000.00 1,000.00 2,500.00 2,500.00
1230 ATEC Korean 19 inch BOX monitor with Adapter Used (3m Warranty) 427 Monitors 0 5,700.00 0.00 0.00 0.00 0.00
1484 Asus 22 inch LCD Monitor Used (3m Warranty) 428 Monitors 0 6,100.00 0.00 0.00 0.00 0.00
1534 Branded 19 inch LCD WIDE Monitor A-Grade (3m Warranty) 429 Monitors 2 5,500.00 11,000.00 11,000.00 13,800.00 13,800.00
1533 Branded 19 inch LCD WIDE Monitor B-Grade (3m Warranty) 430 Monitors 2 4,000.00 8,000.00 8,000.00 12,000.00 12,000.00
1536 Branded 19 inch LED WIDE Monitor A-Grade (3m Warranty) 431 Monitors 0 4,500.00 0.00 0.00 0.00 0.00
1535 Branded 19 inch LED WIDE Monitor B-Grade (3m Warranty) 432 Monitors 1 3,900.00 3,900.00 3,900.00 6,500.00 6,500.00

=== PAGE 20 ===
1596 Branded 19 inch WIDE B-C-Grade Monitor (2w Warranty) 433 Monitors -1 0.00 0.00 0.00 -2,000.00 -2,000.00
1521 Branded 20 INCH LCD WIDE Monitor A Grade Used (3m Warranty) 434 Monitors 1 4,000.00 4,000.00 4,000.00 6,900.00 6,900.00
1522 Branded 20 INCH LCD WIDE Monitor B Grade Used (3m Warranty) 435 Monitors 1 3,750.00 3,750.00 3,750.00 5,900.00 5,900.00
1537 Branded 20 INCH LED WIDE Monitor A Grade Used (3m Warranty) 436 Monitors 0 4,500.00 0.00 0.00 0.00 0.00
1544 Branded 20 inch LED WIDE Monitor B-Grade (3m Warranty) 437 Monitors 1 5,000.00 5,000.00 5,000.00 6,900.00 6,900.00
1444 DELL 24 Inch LCD Monitor with HDMI Used (3m Warranty) 438 Monitors 0 7,750.00 0.00 0.00 0.00 0.00
1449 Dell 23 inch IPS Monitor Used (3m Warranty) 439 Monitors 0 8,500.00 0.00 0.00 0.00 0.00
1162 Dell 24 inch IPS Monitor Used (3m Warranty) 440 Monitors 5 9,300.00 46,500.00 46,500.00 62,500.00 62,500.00
1163 Dell/HP 22 inch DP LED Monitor Used (3m Warranty) 441 Monitors 1 7,600.00 7,600.00 7,600.00 9,500.00 9,500.00
1516 HP 20 INCH B GRADE Monitor (1m Warranty) 442 Monitors 1 2,000.00 2,000.00 2,000.00 3,500.00 3,500.00
1546 HP 22 Inch Slim IPS Frameless Monitor Used (3m Warranty) 443 Monitors 1 13,000.00 13,000.00 13,000.00 16,500.00 16,500.00
1165 HP 22 inch Frameless IPS Monitor Used (3m Warranty) 444 Monitors 3 13,000.00 39,000.00 39,000.00 49,500.00 49,500.00
1443 HP 22 inch LCD Monitor Used (3m Warranty) 445 Monitors 0 6,600.00 0.00 0.00 0.00 0.00
1164 HP 23 inch LED DP Monitor Used (3m Warranty) 446 Monitors 0 7,500.00 0.00 0.00 0.00 0.00
1168 HP 24 inch Frameless IPS Monitor Used (3m Warranty) 447 Monitors 0 17,000.00 0.00 0.00 0.00 0.00
1231 HP 24 inch IPS HDMI Monitor Used (3m Warranty) 448 Monitors 0 10,833.33 0.00 0.00 0.00 0.00
1166 HP Z22 IPS 22 inch Frameless Gaming Monitor Used (3m Warranty) 449 Monitors 1 13,000.00 13,000.00 13,000.00 16,900.00 16,900.00
1474 HP Z23 Frameless IPS FHD Monitor Used (3m Warranty) 450 Monitors 0 14,500.00 0.00 0.00 0.00 0.00
1485 HP Z23 Frameless IPS Monitor Used- B Grade (3m Warranty) 451 Monitors 1 12,250.00 12,250.00 12,250.00 16,500.00 16,500.00
452 1434 Monitors LG 15 inch Monitor Used (1m Warranty) 0 1,700.00 0.00 0.00 0.00 0.00
1598 LUCOMS KOREAN 22 Inch LED Monitor Used (3m Warranty) 453 Monitors 2 4,500.00 9,000.00 9,000.00 15,000.00 15,000.00

=== PAGE 21 ===
1543 Lenovo 20 Inch HD+ LED Monitor Used (3m Warranty) 454 Monitors 5 6,000.00 30,000.00 30,000.00 39,500.00 39,500.00
1252 Lenovo 22 inch LED Monitor Used (3m Warranty) 455 Monitors 0 7,800.00 0.00 0.00 0.00 0.00
1167 Lenovo 24 inch IPS Framless Monitor Used (3m Warranty) 456 Monitors 29 11,115.85 322,359.76 322,359.76 609,000.00 609,000.00
1253 Philips 17 icnh LED Monitor Used (3m Warranty) 457 Monitors 0 3,500.00 0.00 0.00 0.00 0.00
1552 Philips 24 Inch Frameless B Grade Monitor Used (3m Warranty) 458 Monitors 1 13,000.00 13,000.00 13,000.00 14,000.00 14,000.00
1545 Philips 24 inch IPS Frameless Monitor Used (3m Warranty) 459 Monitors 2 16,000.00 32,000.00 32,000.00 33,000.00 33,000.00
1508 Samsung LCD 17 INCH C Grade Monitor (1m Warranty) 460 Monitors 1 2,000.00 2,000.00 2,000.00 3,250.00 3,250.00
1384 Singer 14 inch Wide Monitor Used (1m Warranty) 461 Monitors 0 2,600.00 0.00 0.00 0.00 0.00
1486 Thinkvison 24 inch LED Monitor Used (3m Warranty) 462 Monitors 0 9,200.00 0.00 0.00 0.00 0.00
1547 Thinkvison E1922s Wide LED HD Monitor New (1/2Y Wrranty) 463 Monitors 4 8,500.00 34,000.00 34,000.00 62,000.00 62,000.00
1174 Asus B150m plus Motherboard Used (3m Warranty) 464 Motherboard 0 9,000.00 0.00 0.00 0.00 0.00
1186 Asus B75 Gaming Motherboard Used (3m Warranty) 465 Motherboard 1 3,600.00 3,600.00 3,600.00 5,500.00 5,500.00
1181 Asus Prime B350 Plus AM4 Motherboard Used (3m Warranty) 466 Motherboard 1 17,500.00 17,500.00 17,500.00 22,500.00 22,500.00
1466 AORUS B450 PRO WIFI Motherboard Used (3m Warranty) 467 Motherboard 0 17,500.00 0.00 0.00 0.00 0.00
1178 AORUS B460M ELITE Motherboard Used (3m Warranty) 468 Motherboard 0 19,000.00 0.00 0.00 0.00 0.00
1428 Asrock B150 6th Gen Motherboard Used (3m Warranty) 469 Motherboard 1 9,000.00 9,000.00 9,000.00 11,500.00 11,500.00
1539 Asrock B85 PRO ATX Gaming Motherboard Used (3m Warranty) 470 Motherboard 2 7,500.00 15,000.00 15,000.00 18,000.00 18,000.00
471 1562 Motherboard Asrock G31 motherboard -1 0.00 0.00 0.00 0.00 0.00
1541 Asrock H87 ATX Gaming Motherboard Used (3m Warranty) 472 Motherboard 1 6,900.00 6,900.00 6,900.00 8,900.00 8,900.00
1179 Asus B360 2-Ram Slot Motherboard Used (3m Warranty) 473 Motherboard 1 8,250.00 8,250.00 8,250.00 10,500.00 10,500.00
1184 Asus B460 Plus Motherboard Used (3m Warranty) 474 Motherboard 0 17,000.00 0.00 0.00 0.00 0.00

=== PAGE 22 ===
1401 Asus H110 M.2 Motherboard Used (3m Warranty) 475 Motherboard 0 8,000.00 0.00 0.00 0.00 0.00
1173 Asus H110 Motherboard Used (3m Warranty) 476 Motherboard 0 6,900.00 0.00 0.00 0.00 0.00
1176 Asus H310 8th & 9th Gen M.2 Motherboard Used (3m Warranty) 477 Motherboard 1 9,000.00 9,000.00 9,000.00 11,500.00 11,500.00
1540 Asus H87 ATX Gaming Motherboard Used (3m Warranty) 478 Motherboard 0 6,900.00 0.00 0.00 0.00 0.00
1558 Asus H97 4th Gen ATX M.2 Support Gaming Motherboard Used (3m Warranty) 479 Motherboard 3 7,250.00 21,750.00 21,750.00 28,500.00 28,500.00
1185 Asus Prime Z370 A Motherboard Used (3m Warranty) 480 Motherboard 1 18,000.00 18,000.00 18,000.00 21,500.00 21,500.00
1182 Asus Z370 P Motherboard Used (3m warranty) 481 Motherboard 0 16,000.00 0.00 0.00 0.00 0.00
1559 Asus Z97 4th Gen ATX Gaming Motherboard Used (3m Warranty) 482 Motherboard 1 7,200.00 7,200.00 7,200.00 9,000.00 9,000.00
1557 Asus Z97 4th Gen ATX M.2 Support Gaming Motherboard Used (3m Warranty) 483 Motherboard 1 7,250.00 7,250.00 7,250.00 9,500.00 9,500.00
1390 Asus/Gigabyte B85 ATX Gaming Motherboard Used (3m Warranty) 484 Motherboard 1 6,000.00 6,000.00 6,000.00 7,500.00 7,500.00
1170 Asus/Gigabyte H61 Motherboard (3m Warranty) 485 Motherboard 6 3,562.50 21,375.00 21,375.00 29,400.00 29,400.00
1171 Asus/Gigabyte h81 motherboard Used (3m Warranty) 486 Motherboard 4 4,637.50 18,550.00 18,550.00 23,600.00 23,600.00
1526 BIOSTAR H61 2nd & 3rd Gen Motherboard Used (3m Warranty) 487 Motherboard 0 2,750.00 0.00 0.00 0.00 0.00
1429 ECS H110 M.2 Motherboard Used (3m Warranty) 488 Motherboard 1 7,200.00 7,200.00 7,200.00 9,500.00 9,500.00
1450 Gigabyte B150 M.2 Motherboard Used (3m Warranty) 489 Motherboard 0 8,000.00 0.00 0.00 0.00 0.00
1180 Gigabyte H310 Motherboard Used (3m Warranty) 490 Motherboard 1 7,500.00 7,500.00 7,500.00 10,500.00 10,500.00
491 1169 Motherboard Gigabyte H61 Motherboard (3m Warranty) -1 3,125.00 -3,125.00 -3,125.00 -4,900.00 -4,900.00
1560 Gigabyte H97 4th Gen ATX M.2 Support Gaming Motherboard Used (3m Warranty) 492 Motherboard 0 7,250.00 0.00 0.00 0.00 0.00
1561 Gigabyte H97M Gaming Motherboard Used (3m Warranty) 493 Motherboard 0 7,200.00 0.00 0.00 0.00 0.00
1183 Gigabyte Z390 D Motherboard Used (3m Warranty) 494 Motherboard 1 17,500.00 17,500.00 17,500.00 21,000.00 21,000.00
1172 Gigabyte h81 motherboard Used (3m Warranty) 495 Motherboard 0 4,633.33 0.00 0.00 0.00 0.00

=== PAGE 23 ===
1218 Gigabyte/Asus B85m Gaming Motherboard (3m Warranty) 496 Motherboard 2 5,333.33 10,666.67 10,666.67 13,800.00 13,800.00
1600 H81 Motherboard used 1 ram slot (3m Warranty) 497 Motherboard 1 2,000.00 2,000.00 2,000.00 5,000.00 5,000.00
1232 Intel B75 Gaming Motherboard Used (3m Warranty) 498 Motherboard 1 4,750.00 4,750.00 4,750.00 6,000.00 6,000.00
1175 Korean B250 6th & 7th Gen Motherboard New (1Y Warranty) 499 Motherboard 2 8,500.00 17,000.00 17,000.00 25,000.00 25,000.00
1511 LG 1ST GEN Motherboard Used (3m Warranty) 500 Motherboard 0 2,150.00 0.00 0.00 0.00 0.00
1254 Pegatron H61 Motherboard Used (3m Warranty) 501 Motherboard 0 3,750.00 0.00 0.00 0.00 0.00
1438 Pegatron H81 Motherboard Used (3m Warranty) 502 Motherboard -3 5,000.00 -15,000.00 -15,000.00 -18,750.00 -18,750.00
1177 SOYO H510 10th & 11th Gen Motherboard Used (3m Warranty) 503 Motherboard 1 9,500.00 9,500.00 9,500.00 14,500.00 14,500.00
1234 Samsung B75 2nd & 3rd Gen Motherboard Used (3m Warranty) 504 Motherboard 0 4,000.00 0.00 0.00 0.00 0.00
1578 Samsung H61 Motherboard (3 months warranty) 505 Motherboard 1 3,000.00 3,000.00 3,000.00 4,900.00 4,900.00
1124 Branded 128GB NVMe SSD Used (3m Warranty) 506 NVME USED 1 4,900.00 4,900.00 4,900.00 5,900.00 5,900.00
1437 Branded 256GB 2230 NVMe SSD (3m Warranty) 507 NVME USED 1 5,700.00 5,700.00 5,700.00 7,900.00 7,900.00
1126 Branded 256GB NVMe SSD Used (3m Warranty) 508 NVME USED 1 8,017.37 8,017.37 8,017.37 7,900.00 7,900.00
1128 Branded 512GB NVMe SSD Used (3m Warranty) 509 NVME USED -2 8,000.00 -16,000.00 -16,000.00 -22,000.00 -22,000.00
1123 Samsung 128GB NVMe SSD Used (3m Warranty) 510 NVME USED 0 3,700.00 0.00 0.00 0.00 0.00
1125 Samsung 256GB NVMe SSD Used (3m Warranty) 511 NVME USED 0 4,900.00 0.00 0.00 0.00 0.00
1127 WD 512GB NVMe SSD Gen 4 Used (3m Warranty) 512 NVME USED 0 8,000.00 0.00 0.00 0.00 0.00
1585 4 Sockets extension cord with USB (6m warranty) 513 Other 3 2,200.00 6,600.00 6,600.00 9,750.00 9,750.00
514 1495 Other Android TV BOX New (3m Warranty) 3 3,100.00 9,300.00 9,300.00 14,700.00 14,700.00
515 1408 Other Fully Adjustable Wall Mount Bracket X200 0 1,600.00 0.00 0.00 0.00 0.00
516 1077 Other Laptop Keyboard Protector 5 80.00 400.00 400.00 1,250.00 1,250.00
517 1074 Other Normal Black Mouse pad 7 100.00 700.00 700.00 1,750.00 1,750.00
518 1247 Other Power Supply Tester Analog (3m Warranty) 1 900.00 900.00 900.00 1,500.00 1,500.00

=== PAGE 24 ===
519 1075 Other Printed Mouse Pad 2 175.00 350.00 350.00 700.00 700.00
520 1076 Other Razer Full Mouse Pad 5 500.00 2,500.00 2,500.00 5,000.00 5,000.00
1594 TOBO Multiplug Adapter New (3m Warranty) 521 Other 6 650.00 3,900.00 3,900.00 7,500.00 7,500.00
522 1409 Other Tilt Adjustable Mounting Bracket F01 0 650.00 0.00 0.00 0.00 0.00
523 1093 Other Universal Form Cleaner 650ML 7 400.00 2,800.00 2,800.00 5,600.00 5,600.00
524 1101 Other Wall Mounting Bracket 10-26 Inch 10 250.00 2,500.00 2,500.00 5,500.00 5,500.00
525 1102 Other Wall Mounting Bracket 14-47 Inch 3 350.00 1,050.00 1,050.00 2,250.00 2,250.00
526 1103 Other Wall Mounting Bracket 26-55 Inch 8 750.00 6,000.00 6,000.00 12,000.00 12,000.00
527 1104 Other Wall Mounting Bracket 40-80 inch 9 1,000.00 9,000.00 9,000.00 18,000.00 18,000.00
1472 12V Outdoor Waterproof Power Supply for CCTV Camera New (2Y Warranty) 528 POWERSUPPLY 3 475.00 1,425.00 1,425.00 3,000.00 3,000.00
1239 12V UPS For Router/Camera New (6m Warranty) 529 POWERSUPPLY 0 1,700.00 0.00 0.00 0.00 0.00
1194 400W 80 Plus Power Supply Used (3m Warranty) 530 POWERSUPPLY 5 1,750.00 8,750.00 8,750.00 13,750.00 13,750.00
1193 400w Gaming power supply 6 pin (3m waranty) 531 POWERSUPPLY -2 1,650.00 -3,300.00 -3,300.00 -5,200.00 -5,200.00
1395 450W 6/8pin GAMING Power Supply Used (3m Warranty) 532 POWERSUPPLY 3 1,805.56 5,416.67 5,416.67 9,000.00 9,000.00
1407 500W 80 Plus Power Supply Used (3m Warranty) 533 POWERSUPPLY 1 3,000.00 3,000.00 3,000.00 4,250.00 4,250.00
1195 500w gaming power supply 6pin (3m waranty) 534 POWERSUPPLY 4 2,226.00 8,904.00 8,904.00 14,000.00 14,000.00
1196 500w gaming power supply 8pin (3m waranty) 535 POWERSUPPLY 1 2,700.00 2,700.00 2,700.00 3,750.00 3,750.00
1405 600w gaming power supply 8pin (3m waranty) 536 POWERSUPPLY 7 3,224.57 22,572.00 22,572.00 29,750.00 29,750.00
1396 650W 80+ GAMING POWER SUPPLY USED (3m Warranty) 537 POWERSUPPLY 0 3,600.00 0.00 0.00 0.00 0.00
1469 650W Gaming Modular Power Supply Used (3m Warranty) 538 POWERSUPPLY 0 3,000.00 0.00 0.00 0.00 0.00
1406 700w gaming power supply 8pin (3m waranty) 539 POWERSUPPLY 1 2,750.00 2,750.00 2,750.00 4,900.00 4,900.00
540 1197 POWERSUPPLY Normal Power Supply Used (3m Warranty) 7 1,346.88 9,428.13 9,428.13 14,000.00 14,000.00
1045 Kingston 16GB CANVAS Select Plus SD CARD (1Y Warranty) 541 Pendrives & SD Cards 2 600.00 1,200.00 1,200.00 2,500.00 2,500.00
1046 Kingston 32GB CANVAS Select Plus SD CARD (1Y Warranty) 542 Pendrives & SD Cards 2 1,250.00 2,500.00 2,500.00 5,000.00 5,000.00
1047 Kingston 64GB CANVAS Select Plus SD CARD (1Y Warranty) 543 Pendrives & SD Cards 0 2,200.00 0.00 0.00 0.00 0.00

=== PAGE 25 ===
1044 Kingston 8GB CANVAS Select Plus SD CARD (1Y Warranty) 544 Pendrives & SD Cards 2 450.00 900.00 900.00 1,500.00 1,500.00
1041 Sandisk Cruzer Blade 16GB USB 2.0 Pendrive (1Y Warranty) 545 Pendrives & SD Cards 4 600.00 2,400.00 2,400.00 5,000.00 5,000.00
1042 Sandisk Ultra Fair 32GB USB 3.0 Pendrive (1Y Warranty) 546 Pendrives & SD Cards 0 850.00 0.00 0.00 0.00 0.00
1043 Sandisk Ultra Fair 64GB USB 3.0 Pendrive (1Y Warranty) 547 Pendrives & SD Cards 0 1,250.00 0.00 0.00 0.00 0.00
1501 High Speed 128GB SD Card Taiwan C10 (3m Warranty) 548 Pendrives & SD Cards 1 3,000.00 3,000.00 3,000.00 5,500.00 5,500.00
1473 High Speed 64GB SD Card Taiwan C10 (3m Warranty) 549 Pendrives & SD Cards 1 2,300.00 2,300.00 2,300.00 3,400.00 3,400.00
1499 IMATION 64GB USB 2.0 Pendrive (6m Warranty) 550 Pendrives & SD Cards 2 1,750.00 3,500.00 3,500.00 5,800.00 5,800.00
1506 KODAK 64GB Micro SD Card New (6m Warranty) 551 Pendrives & SD Cards 0 2,500.00 0.00 0.00 0.00 0.00
1507 Kingston 128GB Class 10 Micro SD Card New (6m Warranty) 552 Pendrives & SD Cards 4 4,300.00 17,200.00 17,200.00 22,000.00 22,000.00
1498 Kingston DataTraveler 32GB USB 3.0 Pendrive (6m Warranty) 553 Pendrives & SD Cards 1 1,450.00 1,450.00 1,450.00 2,600.00 2,600.00
1504 Kingston DataTraveler Exodia 64GB USB 3.0 Pen Drive (6m Warranty) 554 Pendrives & SD Cards 4 2,000.00 8,000.00 8,000.00 13,000.00 13,000.00
1436 Micro SD Card 128GB Class-10 (3m Warranty) 555 Pendrives & SD Cards 4 1,600.00 6,400.00 6,400.00 10,000.00 10,000.00
1435 Micro SD Card 64GB Class-10 (3m Warranty) 556 Pendrives & SD Cards 2 900.00 1,800.00 1,800.00 3,500.00 3,500.00
1482 Sandisk 32GB A1 SD Card New (6m Warranty) 557 Pendrives & SD Cards 0 1,500.00 0.00 0.00 0.00 0.00
1525 Sandisk Ultra 64GB Micro SD Card C10 New (5Y Warranty) 558 Pendrives & SD Cards 6 2,550.00 15,300.00 15,300.00 23,400.00 23,400.00
1497 Sandisk Ultra Dual Drive 32GB USB 3.0 Pen Drive (6m Warranty) 559 Pendrives & SD Cards 2 1,750.00 3,500.00 3,500.00 5,800.00 5,800.00
1505 Sandisk Ultra Luxe 128GB USB 3.0 Pendrive New (6m Warranty) 560 Pendrives & SD Cards 2 2,900.00 5,800.00 5,800.00 9,000.00 9,000.00
561 1519 PowerBanks & Batteries 9V ZN-MN Battery 10 85.00 850.00 850.00 1,500.00 1,500.00
562 1517 PowerBanks & Batteries AKKO START AA BATTERY (Single) 71 24.00 1,704.00 1,704.00 3,550.00 3,550.00
563 1518 PowerBanks & Batteries AKKO START AAA BATTERY (Single) 26 19.00 494.00 494.00 1,040.00 1,040.00
1251 JC 12V 7A (650VA) UPS Battery (6m Warranty) 564 PowerBanks & Batteries 2 3,500.00 7,000.00 7,000.00 9,000.00 9,000.00
1100 PORCH 12V 7A (650VA) UPS Battery (6m Warranty) 565 PowerBanks & Batteries 0 3,500.00 0.00 0.00 0.00 0.00
566 1094 PowerBanks & Batteries Prolink 650VA UPS New (1Y Warranty) 0 9,700.00 0.00 0.00 0.00 0.00

=== PAGE 26 ===
1034 Remax RPP-10 10000mAh Powerbank New (6m Warranty) 567 PowerBanks & Batteries 2 1,500.00 3,000.00 3,000.00 5,000.00 5,000.00
1035 Remax RPP-71 10000mAh 22.5W Fast Charge Powerbank (6m Warranty) 568 PowerBanks & Batteries 0 2,250.00 0.00 0.00 0.00 0.00
1036 Remax RPP-72 20000mAh 22.5W Fast Charge Powerbank (6m Warranty) 569 PowerBanks & Batteries 3 3,200.00 9,600.00 9,600.00 16,500.00 16,500.00
570 1225 PowerBanks & Batteries Sony 3V CMOS Battery 1 Piece 34 36.00 1,224.00 1,224.00 3,400.00 3,400.00
571 1233 PowerBanks & Batteries UPS USED 650VA (3m Warranty) 0 1,840.00 0.00 0.00 0.00 0.00
1503 Xprinter 80T Thermal Reciept Printer (6m Warranty) 572 Printers 0 9,500.00 0.00 0.00 0.00 0.00
573 1451 ROUTERS 5 Port Ethernet Switch (3m Warranty) -1 1,150.00 -1,150.00 -1,150.00 -2,000.00 -2,000.00
574 1452 ROUTERS 8 Port Ethernet Switch (3m Warranty) 1 1,450.00 1,450.00 1,450.00 2,500.00 2,500.00
1359 LB Link 4G LTE Unlocked Router BL-CPE30H (6m Warranty) 575 ROUTERS 0 7,000.00 0.00 0.00 0.00 0.00
1404 LB Link AX300 4G WIFI 6 Router New (6m Warranty) 576 ROUTERS -1 7,400.00 -7,400.00 -7,400.00 -9,500.00 -9,500.00
1588 Plery 4G MiFi Mobile Wifi-6 300Mbps Router New (6m Warranty) 577 ROUTERS 2 6,800.00 13,600.00 13,600.00 17,000.00 17,000.00
1589 Plery RE300 dual band WIFI Repeater 300Mbps New ( 578 ROUTERS 1 3,500.00 3,500.00 3,500.00 4,500.00 4,500.00
579 1260 SSD USED 60GB SSD MIXBRAND (3M WARRANTY) -1 0.00 0.00 0.00 -2,000.00 -2,000.00
580 1465 Softwares & Services Games 9995 0.00 0.00 0.00 4,997,500.00 4,997,500.00
581 1200 Softwares & Services MS Ofiice Package 999 0.00 0.00 0.00 99,900.00 99,900.00
582 1362 Softwares & Services Repair -1 0.00 0.00 0.00 -1,000.00 -1,000.00
583 1201 Softwares & Services Service Charge 924 0.50 462.46 462.46 1,386,000.00 1,386,000.00
584 1202 Softwares & Services Softwares 992 0.00 0.00 0.00 99,200.00 99,200.00
585 1199 Softwares & Services Windows 10/11 Installation 977 0.00 0.00 0.00 977,000.00 977,000.00
1261 Kaspersky Standard 1 Device 1 Year Subscription 586 Virus Guards 0 1,750.00 0.00 0.00 0.00 0.00
1262 Kaspersky Standard 3 Device 1 Year Subscription 587 Virus Guards 1 4,000.00 4,000.00 4,000.00 5,200.00 5,200.00
"""

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

def parse_num(s):
    if not s: return 0.0
    return float(s.replace(',', '').replace(' ', ''))

def parse_prefix(prefix):
    sorted_cats = sorted(all_known_categories, key=len, reverse=True)
    
    # Format A: row_idx code [category] name
    # e.g. "1 1510 (none) 15 inch..." or "16 1117 2.5 USED Intel..."
    mA = re.match(r'^(\d+)\s+(\d{3,5})\s+(.*)$', prefix)
    if mA:
        code = mA.group(2)
        remainder = mA.group(3).strip()
        matched_cat = "General"
        name = remainder
        for cat in sorted_cats:
            if remainder.lower().startswith(cat.lower()):
                matched_cat = "General" if cat == '(none)' else cat
                name = remainder[len(cat):].strip()
                break
        return code, name, matched_cat
        
    # Format B: code name row_idx category
    # e.g. "1590 HY-210 TV Mount Full Adjustment 10-32 Inch 4 (none)"
    mB = re.match(r'^(\d{3,5})\s+(.*)$', prefix)
    if mB:
        code = mB.group(1)
        remainder = mB.group(2).strip()
        
        for cat in sorted_cats:
            cat_pattern = re.escape(cat)
            m_end = re.search(r'\s+(\d+)\s+' + cat_pattern + r'$', remainder, re.IGNORECASE)
            if m_end:
                name = remainder[:m_end.start()].strip()
                matched_cat = "General" if cat == '(none)' else cat
                return code, name, matched_cat
            m_end2 = re.search(r'\s+' + cat_pattern + r'\s+(\d+)$', remainder, re.IGNORECASE)
            if m_end2:
                name = remainder[:m_end2.start()].strip()
                matched_cat = "General" if cat == '(none)' else cat
                return code, name, matched_cat
                
        # Format B without row index: e.g. code + name + category
        for cat in sorted_cats:
            if cat != '(none)':
                m_end3 = re.search(r'\s+' + re.escape(cat) + r'$', remainder, re.IGNORECASE)
                if m_end3:
                    name = remainder[:m_end3.start()].strip()
                    return code, name, cat

        return code, remainder, "General"

    # Fallback
    parts = prefix.split()
    code = parts[0] if parts and parts[0].isdigit() else "PRD"
    return code, prefix, "General"

rows_data = []
lines = raw_ocr.splitlines()

for line in lines:
    line = line.strip()
    if not line or line.startswith('===') or 'Cost price' in line or 'Total' in line:
        continue
    
    num_matches = list(re.finditer(r'(-?[\d,]+(?:\.\d{2})?)', line))
    if len(num_matches) < 5:
        continue
    
    total_val = parse_num(num_matches[-1].group(1))
    cost_val = parse_num(num_matches[-5].group(1))
    qty_val = int(parse_num(num_matches[-6].group(1)))
    
    prefix = line[:num_matches[-6].start()].strip()
    
    code, name, matched_cat = parse_prefix(prefix)
    
    # Calculate wholesale selling price
    if qty_val > 0 and total_val > 0:
        wholesale_price = round(total_val / qty_val, 2)
    elif cost_val > 0:
        wholesale_price = round(cost_val * 1.20, 2) # standard 20% margin
    else:
        wholesale_price = 0.0
    
    dealer_price = round(wholesale_price * 0.95, 2) if wholesale_price > 0 else 0.0
    
    is_service = any(x in name.lower() for x in ['credit', 'service charge', 'windows 10/11', 'ms ofiice', 'repair'])
    
    rows_data.append({
        'SKU/Code': code,
        'Name': name,
        'Category': matched_cat,
        'Barcode': '',
        'Model': '',
        'Cost Price (LKR)': cost_val,
        'Wholesale Price (LKR)': wholesale_price,
        'Dealer Price (LKR)': dealer_price,
        'Stock Quantity': max(0, qty_val) if not is_service else 0,
        'Pack Size': 1,
        'Carton Units': 1,
        'Low Stock Level': 5,
        'Status': 'active' if not is_service else 'inactive'
    })

print(f"Extracted {len(rows_data)} products.")

csv_path = r'c:\Users\abdul\Documents\GS-Wholesale\aronium_products_import.csv'
fieldnames = ['SKU/Code', 'Name', 'Category', 'Barcode', 'Model', 'Cost Price (LKR)', 'Wholesale Price (LKR)', 'Dealer Price (LKR)', 'Stock Quantity', 'Pack Size', 'Carton Units', 'Low Stock Level', 'Status']

with open(csv_path, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows_data)

print(f"Saved CSV to {csv_path}")


