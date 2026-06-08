# MSME Language Analysis

**Cases:** 28 · **Accuracy:** 46.4%

## assign_clarify

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `audit karo` | `/assign_clarify` | `general_chat` | LLM general_chat |

## attendance_absent

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `chutti chahiye` | `/absent` | `/absent` | — |

## attendance_present

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `shift mein present` | `/present` | `/present` | — |

## business_discovery

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `business profile` | `/business_discovery` | `/business_discovery` | — |

## department_assignment

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `sales walo ko bolo` | `/depart_assign` | `general_chat` | LLM general_chat |

## general_help

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `commands batao` | `/help` | `general_chat` | LLM general_chat |

## home_menu

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `shuru karte hain` | `general_chat` | `general_chat` | — |

## inventory_count

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `ginati karo` | `extract:inventory_count` | `extract:inventory_count` | — |

## inventory_create

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `naya maal add` | `/inventory_create` | `/inventory_create` | — |

## inventory_delivery

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `ram cement le jaaye` | `extract:delivery` | `extract:null` | Wrong intent/route |

## inventory_issue

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `shyam ko pipe do` | `extract:issue` | `extract:null` | Wrong intent/route |

## inventory_status

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `cement stock` | `/inventory_status` | `general_chat` | LLM general_chat |

## issue_list

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `issues list` | `/issues` | `/issues` | — |

## issue_reporting

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `mixer band` | `/issue` | `general_chat` | LLM general_chat |

## issue_resolve

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `5 band nahi ab theek` | `/resolve` | `general_chat` | LLM general_chat |

## member_lookup

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `kaun kaun hai team mein` | `/members` | `general_chat` | LLM general_chat |

## onboard_vendor

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `naya supplier` | `/onboard_vendor` | `/onboard_vendor` | — |

## onboard_worker

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `naya banda join karega` | `/onboard_worker` | `/assign_clarify` | Wrong intent/route |

## purchase_request

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `cement mangwana hai` | `/purchase_request_create` | `/purchase_request_create` | — |

## report

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `summary dikhao` | `/report` | `/report` | — |

## task_assignment

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `ram safai karo` | `/assign` | `general_chat` | LLM general_chat |

## task_completion

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `kaam ho gaya 14` | `/complete` | `/complete` | — |

## task_delegation

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `15 priya ko` | `/mgrassign` | `general_chat` | LLM general_chat |

## task_listing

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `kaam dikhao` | `/tasks` | `/tasks` | — |

## task_rejection

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `18 reject` | `/mgrreject` | `general_chat` | LLM general_chat |

## task_self_assign

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `12 main karunga` | `/mgrself` | `general_chat` | LLM general_chat |

## task_transfer

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `15 it ko` | `/mgrtransfer` | `general_chat` | LLM general_chat |

## task_update

| Input | Expected | Predicted | Failure reason |
|-------|----------|-----------|----------------|
| `3 aadha ho gaya` | `/update` | `/update` | — |

## Unsupported MSME patterns today

- Verb-only commands without slash (`present`, `leave`, `report`)
- Material shorthand without assignee (`cement stock`, `ginati karo` without count keywords)
- Manager routing shorthand (`18 reject`, `15 it ko`)
- Bare team word (`members`) without `dikhao/batao`