// Brand to model mappings for auto parts inventory

export const BRAND_MODELS: Record<string, string[]> = {
  'Toyota': [
    'Corolla', 'Camry', 'RAV4', 'Highlander', 'Prius', 'Land Cruiser', 
    'Hilux', 'Tacoma', 'Tundra', 'Yaris', 'Avalon', 'Sienna', 
    '4Runner', 'Supra', 'C-HR', 'Venza', 'Sequoia', 'Crown',
    'Axio', 'Allion', 'Premio', 'Fielder', 'Harrier', 'Fortuner',
    'Innova', 'Rush', 'Avanza', 'Vios', 'Wigo', 'Alphard', 'Vellfire'
  ],
  'Honda': [
    'Civic', 'Accord', 'CR-V', 'Pilot', 'HR-V', 'Odyssey',
    'Fit', 'Jazz', 'City', 'Vezel', 'Insight', 'Passport',
    'Ridgeline', 'Element', 'BR-V', 'WR-V', 'Mobilio', 'Freed',
    'Stream', 'Stepwgn', 'Crosstour', 'Clarity', 'e:HEV'
  ],
  'Lexus': [
    'ES', 'IS', 'LS', 'GS', 'RX', 'NX', 'UX', 'GX', 'LX',
    'RC', 'LC', 'CT', 'HS', 'RZ', 'TX'
  ],
  'Nissan': [
    'Altima', 'Sentra', 'Maxima', 'Versa', 'Rogue', 'Murano',
    'Pathfinder', 'Armada', 'Frontier', 'Titan', 'Kicks', 'Juke',
    'Note', 'Tiida', 'Sylphy', 'Teana', 'Skyline', 'GT-R', 'Z',
    'X-Trail', 'Qashqai', 'Patrol', 'Navara', 'Terra', 'Livina',
    'March', 'Leaf', 'Ariya'
  ],
  'Mazda': [
    'Mazda3', 'Mazda6', 'CX-3', 'CX-30', 'CX-5', 'CX-50', 'CX-9',
    'CX-90', 'MX-5 Miata', 'MX-30', 'Demio', 'Axela', 'Atenza',
    'CX-8', 'BT-50', 'Tribute', 'MPV'
  ],
  'Mitsubishi': [
    'Outlander', 'Eclipse Cross', 'Mirage', 'Lancer', 'Pajero',
    'Montero', 'ASX', 'RVR', 'Triton', 'L200', 'Xpander',
    'Delica', 'Colt', 'Galant', 'Attrage', 'Space Star'
  ],
  'Subaru': [
    'Outback', 'Forester', 'Crosstrek', 'Impreza', 'Legacy',
    'Ascent', 'BRZ', 'WRX', 'XV', 'Levorg', 'Exiga', 'Tribeca'
  ],
  'Suzuki': [
    'Swift', 'Vitara', 'Jimny', 'Baleno', 'Ertiga', 'XL7',
    'Celerio', 'Alto', 'Ciaz', 'Dzire', 'S-Cross', 'Ignis',
    'Wagon R', 'Hustler', 'Spacia', 'SX4', 'Grand Vitara'
  ],
  'Ford': [
    'F-150', 'Ranger', 'Mustang', 'Explorer', 'Escape', 'Edge',
    'Bronco', 'Expedition', 'Maverick', 'Focus', 'Fusion', 'Taurus',
    'Transit', 'EcoSport', 'Everest', 'Territory', 'Fiesta'
  ],
  'Chevrolet': [
    'Silverado', 'Colorado', 'Equinox', 'Traverse', 'Tahoe', 'Suburban',
    'Camaro', 'Corvette', 'Malibu', 'Impala', 'Cruze', 'Spark',
    'Trax', 'Blazer', 'Trailblazer', 'Bolt', 'Captiva'
  ],
  'BMW': [
    '1 Series', '2 Series', '3 Series', '4 Series', '5 Series', '6 Series',
    '7 Series', '8 Series', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'X7',
    'iX', 'i3', 'i4', 'i7', 'Z4', 'M2', 'M3', 'M4', 'M5', 'M8'
  ],
  'Mercedes-Benz': [
    'A-Class', 'B-Class', 'C-Class', 'E-Class', 'S-Class', 'CLA', 'CLS',
    'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'G-Class', 'AMG GT',
    'EQA', 'EQB', 'EQC', 'EQE', 'EQS', 'Sprinter', 'Vito'
  ],
  'Volkswagen': [
    'Golf', 'Jetta', 'Passat', 'Tiguan', 'Atlas', 'Taos', 'ID.4',
    'ID.Buzz', 'Arteon', 'Polo', 'T-Cross', 'T-Roc', 'Touareg',
    'Amarok', 'Caddy', 'Transporter', 'Beetle'
  ],
  'Hyundai': [
    'Elantra', 'Sonata', 'Accent', 'Tucson', 'Santa Fe', 'Palisade',
    'Kona', 'Venue', 'Ioniq', 'Ioniq 5', 'Ioniq 6', 'Nexo',
    'Veloster', 'Genesis', 'i10', 'i20', 'i30', 'Creta', 'Stargazer'
  ],
  'Kia': [
    'Forte', 'K5', 'Stinger', 'Sportage', 'Sorento', 'Telluride',
    'Seltos', 'Soul', 'Niro', 'EV6', 'EV9', 'Carnival', 'Rio',
    'Picanto', 'Ceed', 'Cerato', 'Carens'
  ],
  'Audi': [
    'A1', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'Q2', 'Q3', 'Q4',
    'Q5', 'Q7', 'Q8', 'e-tron', 'e-tron GT', 'R8', 'TT',
    'RS3', 'RS4', 'RS5', 'RS6', 'RS7', 'S3', 'S4', 'S5', 'S6'
  ],
  'Volvo': [
    'S60', 'S90', 'V60', 'V90', 'XC40', 'XC60', 'XC90',
    'C40', 'EX30', 'EX90', 'Polestar 2'
  ],
  'Jeep': [
    'Wrangler', 'Grand Cherokee', 'Cherokee', 'Compass', 'Renegade',
    'Gladiator', 'Wagoneer', 'Grand Wagoneer'
  ],
  'Land Rover': [
    'Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque',
    'Discovery', 'Discovery Sport', 'Defender'
  ],
  'Porsche': [
    '911', 'Cayenne', 'Macan', 'Panamera', 'Taycan', 'Boxster', 'Cayman'
  ],
  'Isuzu': [
    'D-Max', 'MU-X', 'Trooper', 'Rodeo', 'Crosswind', 'Alterra'
  ],
  'Peugeot': [
    '208', '308', '408', '508', '2008', '3008', '5008', 'Rifter', 'Partner'
  ],
  'Renault': [
    'Clio', 'Megane', 'Captur', 'Kadjar', 'Koleos', 'Arkana', 'Duster',
    'Kwid', 'Triber', 'Kiger'
  ]
};

// List of common brands for the dropdown
export const COMMON_BRANDS = [
  'Toyota', 'Honda', 'Lexus', 'Nissan', 'Mazda', 'Mitsubishi', 
  'Subaru', 'Suzuki', 'Ford', 'Chevrolet', 'BMW', 'Mercedes-Benz', 
  'Volkswagen', 'Hyundai', 'Kia', 'Audi', 'Volvo', 'Jeep', 
  'Land Rover', 'Porsche', 'Isuzu', 'Peugeot', 'Renault'
];

export const YEARS = Array.from({ length: 35 }, (_, i) => (2025 - i).toString());
