# Entity Extraction Results

## Classify entities (`worker_slug`, `depart_slug`, `id`, etc.)

Cases with expected entities: 68
Entity field accuracy (when expected): **17.6%**

### Classify entity failures (sample)

| Message | Expected entities | Extracted |
|---------|-------------------|-----------|
| @ram aaj warehouse saaf karo | `{'worker_slug': 'ram'}` | `{'id': None, 'worker_slug': '@ram', 'depart_slug': 'operations', 'deadline': '2026-06-08', 'reject_reason': None, 'task_description': None}` |
| Please ask Ram to clean the warehouse today | `{'worker_slug': 'ram'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': '2026-06-08', 'reject_reason': None, 'task_description': None}` |
| ram ko bolna godown saaf kare | `{'worker_slug': 'ram'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| ram se kehna store saaf kare aaj | `{'worker_slug': 'ram'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': '2026-06-08', 'reject_reason': None, 'task_description': None}` |
| ram clean warehouse today | `{'worker_slug': 'ram'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': '2026-06-08', 'reject_reason': None, 'task_description': None}` |
| ram safai karo | `{'worker_slug': 'ram'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| @ram warehous safai | `{'worker_slug': 'ram'}` | `{'id': None, 'worker_slug': '@ram', 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| @ram safai | `{'worker_slug': 'ram'}` | `{'id': None, 'worker_slug': '@ram', 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| ram free hai usko warehouse wala kaam de do | `{'worker_slug': 'ram'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': 'ram free hai usko warehouse wala kaam de do'}` |
| /depart_assign sales today figures | `{'depart_slug': 'sales'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': '2026-06-08', 'reject_reason': None, 'task_description': None}` |
| Ask sales team to send today figures | `{'depart_slug': 'sales'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': '2026-06-08', 'reject_reason': None, 'task_description': 'Ask sales team to send today figures'}` |
| sales team ko aaj ka data bhejne ko bolo | `{'depart_slug': 'sales'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': '2026-06-08', 'reject_reason': None, 'task_description': None}` |
| sales ko figures bhejo aaj ke | `{'depart_slug': 'sales'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': '2026-06-08', 'reject_reason': None, 'task_description': 'sales ko figures bhejo aaj ke'}` |
| sales team figure today send | `{'depart_slug': 'sales'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': '2026-06-08', 'reject_reason': None, 'task_description': 'sales team figure today send'}` |
| sales walo ko bolo | `{'depart_slug': 'sales'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| slaes ko data bhejo | `{'depart_slug': 'sales'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| sales figures | `{'depart_slug': 'sales'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': 'sales figures'}` |
| sales department se kehna aaj closing bhejein | `{'depart_slug': 'sales'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': '2026-06-08', 'reject_reason': None, 'task_description': None}` |
| month end hai sales ko report chahiye | `{'depart_slug': 'sales'}` | `{'id': None, 'worker_slug': None, 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| sales ko figures aur it ko server check | `{'depart_slug': 'sales'}` | `{'id': None, 'worker_slug': None, 'depart_slug': 'it', 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| /mgrassign @priya 15 | `{'worker_slug': 'priya', 'id': 15}` | `{'id': None, 'worker_slug': '@priya', 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| @priya will do task 15 | `{'worker_slug': 'priya', 'id': 15}` | `{'id': 15, 'worker_slug': '@priya', 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| priya ko task 15 do | `{'worker_slug': 'priya', 'id': 15}` | `{'id': 15, 'worker_slug': None, 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| task 15 priya karegi | `{'worker_slug': 'priya', 'id': 15}` | `{'id': 15, 'worker_slug': None, 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |
| priya task 15 do | `{'worker_slug': 'priya', 'id': 15}` | `{'id': 15, 'worker_slug': None, 'depart_slug': None, 'deadline': None, 'reject_reason': None, 'task_description': None}` |

## Task-inventory extraction (`extract_task_inventory`)

| Metric | Value |
|--------|-------|
| Cases | 36 |
| Task-kind accuracy | 50.0% |
| Full entity PASS | 36.1% |

### Per extraction workflow

| Workflow | Intent/kind acc | Entity acc |
|----------|-----------------|------------|
| inventory_delivery | 33.3% | 16.7% |
| inventory_issue | 50.0% | 33.3% |
| inventory_count | 66.7% | 66.7% |

### Extraction failures

- `Please deliver 20 bags of cement to Ram` → expected `extract:delivery` got `extract:delivery` entities `{'item_name_or_sku': 'bags of cement to', 'quantity': 20.0, 'assignee_hint': None, 'task_kind': 'delivery'}`
- `Ram ko 20 cement de do` → expected `extract:delivery` got `extract:issue` entities `{'item_name_or_sku': 'cement', 'quantity': 20.0, 'assignee_hint': 'Ram', 'task_kind': 'issue'}`
- `Ram ko 20 bag cement issue kar do` → expected `extract:delivery` got `extract:issue` entities `{'item_name_or_sku': 'bag cement', 'quantity': 20.0, 'assignee_hint': 'Ram', 'task_kind': 'issue'}`
- `20 cement Ram give` → expected `extract:delivery` got `extract:null` entities `{'item_name_or_sku': 'cement ram give', 'quantity': 20.0, 'assignee_hint': None, 'task_kind': None}`
- `ram cement le jaaye` → expected `extract:delivery` got `extract:null` entities `{'item_name_or_sku': None, 'quantity': None, 'assignee_hint': None, 'task_kind': None}`
- `ram ko 20 cemnt delo` → expected `extract:delivery` got `extract:null` entities `{'item_name_or_sku': 'cemnt delo', 'quantity': 20.0, 'assignee_hint': 'Ram', 'task_kind': None}`
- `20 cement ram` → expected `extract:delivery` got `extract:null` entities `{'item_name_or_sku': 'cement ram', 'quantity': 20.0, 'assignee_hint': None, 'task_kind': None}`
- `Ram ko material chahiye tha usko 20 cement de do` → expected `extract:delivery` got `extract:issue` entities `{'item_name_or_sku': 'cement', 'quantity': 20.0, 'assignee_hint': 'Ram', 'task_kind': 'issue'}`
- `Kal jo Ram ne material manga tha 20 cement bhej do` → expected `extract:delivery` got `extract:delivery` entities `{'item_name_or_sku': 'cement', 'quantity': 20.0, 'assignee_hint': None, 'task_kind': 'delivery'}`
- `Ram ko 20 cement de do aur Shyam ko kal site bhejna` → expected `extract:delivery` got `extract:issue` entities `{'item_name_or_sku': 'cement', 'quantity': 20.0, 'assignee_hint': 'Ram', 'task_kind': 'issue'}`
- `Issue 5 steel rods to Shyam` → expected `extract:issue` got `extract:issue` entities `{'item_name_or_sku': 'steel rods to shyam', 'quantity': 5.0, 'assignee_hint': None, 'task_kind': 'issue'}`
- `5 pipe shyam give` → expected `extract:issue` got `extract:null` entities `{'item_name_or_sku': 'pipe shyam give', 'quantity': 5.0, 'assignee_hint': None, 'task_kind': None}`
- `shyam ko pipe do` → expected `extract:issue` got `extract:null` entities `{'item_name_or_sku': 'pipe do', 'quantity': None, 'assignee_hint': 'Shyam', 'task_kind': None}`
- `shyam ko 5 pip issue` → expected `extract:issue` got `extract:issue` entities `{'item_name_or_sku': 'pip', 'quantity': 5.0, 'assignee_hint': 'Shyam', 'task_kind': 'issue'}`
- `5 pipe shyam` → expected `extract:issue` got `extract:null` entities `{'item_name_or_sku': 'pipe shyam', 'quantity': 5.0, 'assignee_hint': None, 'task_kind': None}`
- `site pe shyam ko 5 pipe chahiye issue karo` → expected `extract:issue` got `extract:issue` entities `{'item_name_or_sku': 'pipe chahiye', 'quantity': 5.0, 'assignee_hint': 'Shyam', 'task_kind': 'issue'}`
- `kal order tha shyam ko 5 pipe` → expected `extract:issue` got `extract:null` entities `{'item_name_or_sku': 'pipe', 'quantity': 5.0, 'assignee_hint': 'Shyam', 'task_kind': None}`
- `material bhej do` → expected `extract:null` got `extract:delivery` entities `{'item_name_or_sku': None, 'quantity': None, 'assignee_hint': None, 'task_kind': 'delivery'}`
- `shyam ko 5 pipe aur ram ko cement` → expected `extract:issue` got `extract:null` entities `{'item_name_or_sku': 'pipe aur ram', 'quantity': 5.0, 'assignee_hint': 'Shyam', 'task_kind': None}`
- `count stock` → expected `extract:inventory_count` got `extract:null` entities `{'item_name_or_sku': None, 'quantity': None, 'assignee_hint': None, 'task_kind': None}`