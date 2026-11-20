/* Credits sample data: a copy of data/sample-job.json as a script, because the prototype opens from disk and
   cannot fetch() local files. Change both files together. */
const CR_DATA = {
  "_note": "Sample data for the prototype. Job, people and packages follow Robert Campbell's job prototype. Single-item prices and lab costs are invented for the margin view and are not real figures.",
  "photographer": {
    "name": "Robert Campbell",
    "studio": "Campbell Photo",
    "email": "robert@campbellphoto.com"
  },
  "job": {
    "id": "job-riverside-2026",
    "name": "Riverside Youth Soccer League — Spring 2026",
    "organization": "Riverside Youth Sports Association",
    "shootDate": "2026-05-14",
    "location": "Riverside Park, York, PA",
    "subjects": 142,
    "registered": 96,
    "phase": "before_photos",
    "phaseOptions": [
      "before_photos",
      "photos_available"
    ],
    "creditSalesOn": true,
    "packageFirstCheckout": false,
    "priceList": "Youth Sports 2026",
    "registrationLink": "zenfol.io/r/riverside-soccer-26"
  },
  "galleries": [
    {
      "id": "g-smith-jordan",
      "name": "Smith, Jordan",
      "folder": "Riverside Raptors U12",
      "photos": 24
    },
    {
      "id": "g-smith-ava",
      "name": "Smith, Ava",
      "folder": "Eagles U10",
      "photos": 19
    },
    {
      "id": "g-johnson-aiden",
      "name": "Johnson, Aiden",
      "folder": "Eagles U10",
      "photos": 27
    },
    {
      "id": "g-williams-marcus",
      "name": "Williams, Marcus",
      "folder": "Riverside Raptors U12",
      "photos": 31
    },
    {
      "id": "g-martinez-ethan",
      "name": "Martinez, Ethan",
      "folder": "Eagles U10",
      "photos": 34
    },
    {
      "id": "g-team-raptors",
      "name": "Team — Riverside Raptors U12",
      "folder": "Riverside Raptors U12",
      "photos": 18
    }
  ],
  "priceList": {
    "name": "Youth Sports 2026",
    "items": [
      {
        "id": "i-digital",
        "name": "Digital download",
        "price": 12,
        "labCost": 0
      },
      {
        "id": "i-8x10",
        "name": "8×10 print",
        "price": 15,
        "labCost": 2.5
      },
      {
        "id": "i-5x7",
        "name": "5×7 print",
        "price": 10,
        "labCost": 1.6
      },
      {
        "id": "i-wallets",
        "name": "Wallets (set of 8)",
        "price": 12,
        "labCost": 2.2
      },
      {
        "id": "i-magnet",
        "name": "Photo magnet",
        "price": 14,
        "labCost": 4.8
      },
      {
        "id": "i-team-8x10",
        "name": "Team photo 8×10",
        "price": 15,
        "labCost": 2.5
      },
      {
        "id": "i-memory-mate",
        "name": "Memory mate",
        "price": 9,
        "labCost": 3.9
      }
    ],
    "packages": [
      {
        "id": "p-digital",
        "name": "Digital Package",
        "description": "Your three favourite photos as high-resolution downloads.",
        "price": 25,
        "contents": [
          "i-digital",
          "i-digital",
          "i-digital"
        ]
      },
      {
        "id": "p-print",
        "name": "Print Bundle — 8×10 + wallets",
        "description": "One photo as an 8×10, a 5×7 and a set of 8 wallets.",
        "price": 35,
        "contents": [
          "i-8x10",
          "i-wallets",
          "i-5x7"
        ]
      },
      {
        "id": "p-deluxe",
        "name": "Deluxe — digital + prints + magnet",
        "description": "A digital download plus an 8×10, a 5×7, wallets and a magnet.",
        "price": 55,
        "contents": [
          "i-digital",
          "i-8x10",
          "i-5x7",
          "i-wallets",
          "i-magnet"
        ]
      }
    ]
  },
  "fees": {
    "_note": "Sample rates for the margin view, not real figures. Processing fee follows ADO 85123: a high estimate on the selling price as a single-item order (real build: the connected processor's regional rate, or the highest standard rate the plan allows; the flat per-order fee is still to come). Commission is a stand-in (open), a percentage of what the client actually paid for the item.",
    "processingPct": 2.9,
    "commissionPct": 5
  },
  "creditOffer": {
    "id": "co-riverside",
    "status": "published",
    "amounts": [
      {
        "paid": 25,
        "face": 25
      },
      {
        "paid": 50,
        "face": 55
      },
      {
        "paid": 85,
        "face": 100
      }
    ],
    "examplePackages": [
      "p-digital",
      "p-print",
      "p-deluxe"
    ],
    "purchaseWindow": {
      "opens": "2026-04-20",
      "closes": "shoot date",
      "rule": "closes on the shoot date"
    },
    "expiry": "[expiry period]",
    "registration": {
      "required": true,
      "purchaseRequired": false,
      "questions": [
        {
          "label": "Student name",
          "type": "text"
        },
        {
          "label": "Team",
          "type": "choice",
          "options": [
            "Riverside Raptors U12",
            "Eagles U10"
          ]
        },
        {
          "label": "Jersey number",
          "type": "text"
        },
        {
          "label": "Coach",
          "type": "text"
        }
      ]
    }
  },
  "studentContacts": [
    {
      "_note": "Sample student audience contact (2026-11-05): used to show who can pre-order",
      "clientId": "c-tom-johnson",
      "name": "Aiden Johnson",
      "email": "aiden.johnson@students.riversideysa.org",
      "audience": "Students"
    }
  ],
  "clients": [
    {
      "id": "c-dana-smith",
      "name": "Dana Smith",
      "email": "dana.smith@yopmail.com",
      "galleries": [
        "g-smith-jordan",
        "g-smith-ava"
      ],
      "note": "Sibling case: two children in the same job share one balance",
      "ledger": [
        {
          "type": "purchase",
          "paid": 85,
          "face": 100,
          "date": "2026-05-02"
        }
      ],
      "demoPlan": "In the demo: buys the Deluxe package for $55 + $8 shipping in Jordan's gallery, then a $15 8×10 + $8 shipping in Ava's gallery, leaving $14"
    },
    {
      "id": "c-tom-johnson",
      "name": "Tom Johnson",
      "email": "tjohnson44@yopmail.com",
      "galleries": [
        "g-johnson-aiden"
      ],
      "ledger": [
        {
          "type": "purchase",
          "paid": 25,
          "face": 25,
          "date": "2026-05-03"
        }
      ],
      "note": "Unspent credit, receives the reminder email"
    },
    {
      "id": "c-luis-martinez",
      "name": "Luis Martinez",
      "email": "lmartinez@yopmail.com",
      "galleries": [
        "g-martinez-ethan"
      ],
      "ledger": [
        {
          "type": "purchase",
          "paid": 50,
          "face": 55,
          "date": "2026-04-28"
        },
        {
          "type": "redemption",
          "amount": 55,
          "orderId": "o-1042",
          "date": "2026-05-20"
        }
      ],
      "orders": [
        {
          "id": "o-1042",
          "items": [
            "p-print",
            "i-8x10",
            "i-digital"
          ],
          "total": 62,
          "creditApplied": 55,
          "cardCharged": 7,
          "shortfall": 2.38,
          "status": "awaiting approval"
        }
      ],
      "note": "Credit used up, $7 paid by card"
    },
    {
      "id": "c-priya-williams",
      "name": "Priya Williams",
      "email": "priya.w@yopmail.com",
      "galleries": [
        "g-williams-marcus"
      ],
      "ledger": [],
      "note": "Registered only, no credit. Sees the standard store once photos are available"
    }
  ],
  "jobTotalsForDashboard": {
    "_note": "Totals across all 142 subjects, so the dashboard looks populated beyond the four clients above",
    "clientsWithCredit": 41,
    "creditPaid": 2145,
    "creditFaceValue": 2390,
    "creditRedeemed": 610,
    "securedFunds": 1980,
    "paidOut": 165
  }
};
