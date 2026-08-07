-- Migration 002: catálogo inteiramente fictício para desenvolvimento.
-- Nenhum preço representa uma condição real ou atual.
insert into public.categories (id, name, slug, sort_order) values
('cat-cpu','Processador','processador',1),('cat-mb','Placa-mãe','placa-mae',2),('cat-ram','Memória RAM','memoria-ram',3),('cat-gpu','Placa de vídeo','placa-de-video',4),
('cat-storage','Armazenamento','armazenamento',5),('cat-psu','Fonte','fonte',6),('cat-case','Gabinete','gabinete',7),('cat-cooler','Cooler','cooler',8)
on conflict (id) do nothing;

insert into public.stores (id,name,slug,website_url) values
('store-orbit','Loja Órbita (demo)','loja-orbita-demo','https://example.com'),
('store-circuit','Circuito Shop (demo)','circuito-shop-demo','https://example.org'),
('store-pixel','Pixel Hardware (demo)','pixel-hardware-demo','https://example.net')
on conflict (id) do nothing;

insert into public.components (id,category_id,brand,name,slug,description,image_url,estimated_watts,specifications) values
('cpu-am5-6','cat-cpu','Aurora Demo','A6 7600','aurora-demo-a6-7600','Processador demonstrativo eficiente.','/products/processador.svg',65,'{"kind":"processor","socket":"AM5","cores":6,"threads":12,"baseClockGhz":3.8,"turboClockGhz":5.1,"tdpWatts":65,"integratedGraphics":true,"coolerIncluded":true}'),
('cpu-am5-8','cat-cpu','Aurora Demo','A8 7800X','aurora-demo-a8-7800x','Processador demonstrativo de alto desempenho.','/products/processador.svg',120,'{"kind":"processor","socket":"AM5","cores":8,"threads":16,"baseClockGhz":4.2,"turboClockGhz":5,"tdpWatts":120,"integratedGraphics":false,"coolerIncluded":false}'),
('cpu-lga1700-6','cat-cpu','Vector Demo','V5 14400','vector-demo-v5-14400','Processador demonstrativo para produtividade.','/products/processador.svg',65,'{"kind":"processor","socket":"LGA1700","cores":10,"threads":16,"baseClockGhz":2.5,"turboClockGhz":4.7,"tdpWatts":65,"integratedGraphics":true,"coolerIncluded":true}'),
('cpu-lga1700-8','cat-cpu','Vector Demo','V7 14700F','vector-demo-v7-14700f','Processador demonstrativo sem vídeo integrado.','/products/processador.svg',125,'{"kind":"processor","socket":"LGA1700","cores":20,"threads":28,"baseClockGhz":2.1,"turboClockGhz":5.4,"tdpWatts":125,"integratedGraphics":false,"coolerIncluded":false}'),
('mb-am5-ddr5-atx','cat-mb','NexBoard Demo','B650 Atlas','nexboard-demo-b650-atlas','Placa-mãe AM5 ATX demonstrativa.','/products/placa-mae.svg',55,'{"kind":"motherboard","socket":"AM5","chipset":"B650","formFactor":"ATX","memoryType":"DDR5","memorySlots":4,"maxMemoryGb":192,"m2Slots":3,"sataPorts":4,"pcieVersion":4,"wifi":true,"storageInterfaces":["M.2 NVMe","SATA"]}'),
('mb-am5-ddr5-matx','cat-mb','NexBoard Demo','A620 Compact','nexboard-demo-a620-compact','Placa-mãe AM5 compacta demonstrativa.','/products/placa-mae.svg',45,'{"kind":"motherboard","socket":"AM5","chipset":"A620","formFactor":"Micro-ATX","memoryType":"DDR5","memorySlots":2,"maxMemoryGb":96,"m2Slots":1,"sataPorts":4,"pcieVersion":4,"wifi":false,"biosWarning":"Este processador pode exigir BIOS versão 2.1 ou mais recente.","storageInterfaces":["M.2 NVMe","SATA"]}'),
('mb-lga-ddr4-atx','cat-mb','CoreGrid Demo','B760 Forge D4','coregrid-demo-b760-forge-d4','Placa-mãe LGA1700 DDR4 demonstrativa.','/products/placa-mae.svg',50,'{"kind":"motherboard","socket":"LGA1700","chipset":"B760","formFactor":"ATX","memoryType":"DDR4","memorySlots":4,"maxMemoryGb":128,"m2Slots":2,"sataPorts":4,"pcieVersion":4,"wifi":false,"storageInterfaces":["M.2 NVMe","SATA"]}'),
('mb-lga-ddr5-itx','cat-mb','CoreGrid Demo','Z790 Nano','coregrid-demo-z790-nano','Placa-mãe Mini-ITX DDR5 demonstrativa.','/products/placa-mae.svg',48,'{"kind":"motherboard","socket":"LGA1700","chipset":"Z790","formFactor":"Mini-ITX","memoryType":"DDR5","memorySlots":2,"maxMemoryGb":96,"m2Slots":2,"sataPorts":2,"pcieVersion":5,"wifi":true,"storageInterfaces":["M.2 NVMe","SATA"]}'),
('ram-ddr5-32','cat-ram','Pulse Demo','Neon 32 GB 6000','pulse-demo-neon-32-gb-6000','Kit DDR5 demonstrativo.','/products/memoria-ram.svg',10,'{"kind":"memory","memoryType":"DDR5","capacityGb":32,"modules":2,"frequencyMhz":6000,"latency":"CL36","voltage":1.35}'),
('ram-ddr5-64','cat-ram','Pulse Demo','Studio 64 GB 5600','pulse-demo-studio-64-gb-5600','Kit DDR5 demonstrativo.','/products/memoria-ram.svg',14,'{"kind":"memory","memoryType":"DDR5","capacityGb":64,"modules":2,"frequencyMhz":5600,"latency":"CL40","voltage":1.25}'),
('ram-ddr4-16','cat-ram','ByteWorks Demo','Core 16 GB 3200','byteworks-demo-core-16-gb-3200','Kit DDR4 demonstrativo.','/products/memoria-ram.svg',7,'{"kind":"memory","memoryType":"DDR4","capacityGb":16,"modules":2,"frequencyMhz":3200,"latency":"CL16","voltage":1.35}'),
('ram-ddr4-128','cat-ram','ByteWorks Demo','Max 128 GB 3600','byteworks-demo-max-128-gb-3600','Kit DDR4 demonstrativo.','/products/memoria-ram.svg',18,'{"kind":"memory","memoryType":"DDR4","capacityGb":128,"modules":4,"frequencyMhz":3600,"latency":"CL18","voltage":1.35}'),
('gpu-180','cat-gpu','Photon Demo','P760 8 GB','photon-demo-p760-8-gb','GPU demonstrativa compacta.','/products/placa-de-video.svg',165,'{"kind":"gpu","chipMaker":"Photon","vramGb":8,"lengthMm":240,"slots":2,"powerWatts":165,"recommendedPsuWatts":550,"powerConnectors":["1x 8 pinos"]}'),
('gpu-260','cat-gpu','Photon Demo','P780 16 GB','photon-demo-p780-16-gb','GPU demonstrativa para alta resolução.','/products/placa-de-video.svg',263,'{"kind":"gpu","chipMaker":"Photon","vramGb":16,"lengthMm":320,"slots":3,"powerWatts":263,"recommendedPsuWatts":700,"powerConnectors":["2x 8 pinos"]}'),
('gpu-220','cat-gpu','Raster Demo','R4070 12 GB','raster-demo-r4070-12-gb','GPU demonstrativa 12VHPWR.','/products/placa-de-video.svg',220,'{"kind":"gpu","chipMaker":"Raster","vramGb":12,"lengthMm":300,"slots":3,"powerWatts":220,"recommendedPsuWatts":650,"powerConnectors":["12VHPWR"]}'),
('gpu-355','cat-gpu','Raster Demo','R4080 16 GB','raster-demo-r4080-16-gb','GPU demonstrativa de grande porte.','/products/placa-de-video.svg',355,'{"kind":"gpu","chipMaker":"Raster","vramGb":16,"lengthMm":358,"slots":4,"powerWatts":355,"recommendedPsuWatts":850,"powerConnectors":["12VHPWR"]}'),
('ssd-nvme-1','cat-storage','FlashPoint Demo','N1 1 TB','flashpoint-demo-n1-1-tb','SSD NVMe demonstrativo.','/products/armazenamento.svg',7,'{"kind":"storage","storageType":"SSD NVMe","capacityGb":1000,"interface":"M.2 NVMe","formFactor":"M.2 2280","readSpeedMbps":5000,"writeSpeedMbps":4200}'),
('ssd-nvme-2','cat-storage','FlashPoint Demo','N2 2 TB','flashpoint-demo-n2-2-tb','SSD NVMe demonstrativo.','/products/armazenamento.svg',9,'{"kind":"storage","storageType":"SSD NVMe","capacityGb":2000,"interface":"M.2 NVMe","formFactor":"M.2 2280","readSpeedMbps":7000,"writeSpeedMbps":6500}'),
('ssd-sata-1','cat-storage','DataNest Demo','S1 1 TB','datanest-demo-s1-1-tb','SSD SATA demonstrativo.','/products/armazenamento.svg',5,'{"kind":"storage","storageType":"SSD SATA","capacityGb":1000,"interface":"SATA","formFactor":"2,5 pol.","readSpeedMbps":560,"writeSpeedMbps":520}'),
('hdd-2','cat-storage','DataNest Demo','Archive 2 TB','datanest-demo-archive-2-tb','HDD demonstrativo.','/products/armazenamento.svg',8,'{"kind":"storage","storageType":"HDD","capacityGb":2000,"interface":"SATA","formFactor":"3,5 pol.","readSpeedMbps":180,"writeSpeedMbps":170}'),
('psu-500','cat-psu','VoltSafe Demo','V500 Bronze','voltsafe-demo-v500-bronze','Fonte ATX demonstrativa.','/products/fonte.svg',0,'{"kind":"psu","wattage":500,"certification":"80 Plus Bronze","formFactor":"ATX","modularity":"Não modular","pcieConnectors":["1x 8 pinos"],"has12Vhpwr":false,"activePfc":true}'),
('psu-650','cat-psu','VoltSafe Demo','V650 Gold','voltsafe-demo-v650-gold','Fonte ATX demonstrativa.','/products/fonte.svg',0,'{"kind":"psu","wattage":650,"certification":"80 Plus Gold","formFactor":"ATX","modularity":"Semi-modular","pcieConnectors":["2x 8 pinos"],"has12Vhpwr":false,"activePfc":true}'),
('psu-750','cat-psu','PowerNest Demo','P750 Gold','powernest-demo-p750-gold','Fonte ATX demonstrativa 12VHPWR.','/products/fonte.svg',0,'{"kind":"psu","wattage":750,"certification":"80 Plus Gold","formFactor":"ATX","modularity":"Modular","pcieConnectors":["2x 8 pinos","12VHPWR"],"has12Vhpwr":true,"activePfc":true}'),
('psu-850-sfx','cat-psu','PowerNest Demo','P850 SFX','powernest-demo-p850-sfx','Fonte SFX demonstrativa.','/products/fonte.svg',0,'{"kind":"psu","wattage":850,"certification":"80 Plus Gold","formFactor":"SFX","modularity":"Modular","pcieConnectors":["3x 8 pinos","12VHPWR"],"has12Vhpwr":true,"activePfc":true}'),
('case-atx-330','cat-case','FrameLab Demo','Air 330','framelab-demo-air-330','Gabinete ATX demonstrativo.','/products/gabinete.svg',15,'{"kind":"case","motherboardFormFactors":["ATX","Micro-ATX","Mini-ITX"],"maxGpuLengthMm":330,"maxCoolerHeightMm":165,"maxRadiatorMm":360,"psuFormFactors":["ATX"],"fanSlots":7}'),
('case-matx-280','cat-case','FrameLab Demo','Mini Air 280','framelab-demo-mini-air-280','Gabinete Micro-ATX demonstrativo.','/products/gabinete.svg',12,'{"kind":"case","motherboardFormFactors":["Micro-ATX","Mini-ITX"],"maxGpuLengthMm":280,"maxCoolerHeightMm":155,"maxRadiatorMm":240,"psuFormFactors":["ATX","SFX"],"fanSlots":5}'),
('case-itx-240','cat-case','NanoShell Demo','N20','nanoshell-demo-n20','Gabinete Mini-ITX demonstrativo.','/products/gabinete.svg',10,'{"kind":"case","motherboardFormFactors":["Mini-ITX"],"maxGpuLengthMm":240,"maxCoolerHeightMm":75,"maxRadiatorMm":120,"psuFormFactors":["SFX"],"fanSlots":3}'),
('case-atx-400','cat-case','NanoShell Demo','Tower 400','nanoshell-demo-tower-400','Gabinete ATX amplo demonstrativo.','/products/gabinete.svg',18,'{"kind":"case","motherboardFormFactors":["ATX","Micro-ATX","Mini-ITX"],"maxGpuLengthMm":400,"maxCoolerHeightMm":185,"maxRadiatorMm":420,"psuFormFactors":["ATX","SFX"],"fanSlots":10}'),
('cooler-air-150','cat-cooler','Frost Demo','Aero 150','frost-demo-aero-150','Air cooler demonstrativo.','/products/cooler.svg',5,'{"kind":"cooler","coolerType":"Air cooler","supportedSockets":["AM5","LGA1700"],"heightMm":150,"supportedTdpWatts":180}'),
('cooler-air-170','cat-cooler','Frost Demo','Tower 170','frost-demo-tower-170','Air cooler demonstrativo.','/products/cooler.svg',8,'{"kind":"cooler","coolerType":"Air cooler","supportedSockets":["AM5"],"heightMm":170,"supportedTdpWatts":250}'),
('cooler-water-240','cat-cooler','LiquidArc Demo','Flow 240','liquidarc-demo-flow-240','Water cooler demonstrativo.','/products/cooler.svg',12,'{"kind":"cooler","coolerType":"Water cooler","supportedSockets":["AM5","LGA1700"],"radiatorMm":240,"supportedTdpWatts":250}'),
('cooler-water-360','cat-cooler','LiquidArc Demo','Flow 360','liquidarc-demo-flow-360','Water cooler demonstrativo.','/products/cooler.svg',15,'{"kind":"cooler","coolerType":"Water cooler","supportedSockets":["LGA1700"],"radiatorMm":360,"supportedTdpWatts":320}')
on conflict (id) do nothing;

-- Duas ofertas demonstrativas por componente, criadas sem scraping.
update public.components set is_demo = true where brand ilike '% Demo';

insert into public.offers (id, component_id, store_id, price, pix_price, installment_price, installments, shipping_price, product_url, affiliate, available, last_checked_at)
select 'offer-' || c.id || '-' || s.suffix, c.id, s.store_id,
  (case c.category_id when 'cat-cpu' then 1099 when 'cat-mb' then 899 when 'cat-ram' then 399 when 'cat-gpu' then 1899 when 'cat-storage' then 349 when 'cat-psu' then 449 when 'cat-case' then 359 else 189 end) + s.extra,
  case when s.suffix = 'orbit' then (case c.category_id when 'cat-cpu' then 1099 when 'cat-mb' then 899 when 'cat-ram' then 399 when 'cat-gpu' then 1899 when 'cat-storage' then 349 when 'cat-psu' then 449 when 'cat-case' then 359 else 189 end) else null end,
  (case c.category_id when 'cat-cpu' then 1099 when 'cat-mb' then 899 when 'cat-ram' then 399 when 'cat-gpu' then 1899 when 'cat-storage' then 349 when 'cat-psu' then 449 when 'cat-case' then 359 else 189 end) + s.extra,
  s.installments, null, s.base_url || c.slug, s.suffix = 'orbit', true, '2026-01-15T14:00:00Z'::timestamptz
from public.components c
cross join (values ('orbit','store-orbit',60,10,'https://example.com/produto/'),('circuit','store-circuit',35,8,'https://example.org/item/')) as s(suffix,store_id,extra,installments,base_url)
on conflict (id) do nothing;

-- Após criar um usuário no Supabase Auth, promova-o manualmente no SQL Editor:
-- insert into public.admin_profiles (user_id, role) values ('UUID-DO-USUARIO', 'admin');
