import { db } from '../models/database';

export interface SeedBranch {
  name: string;
  incharge: string;
  contact: string;
}

export interface SeedTicket {
  sn: string;
  branchName: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  resolution: string | null;
  createdAt: string;
  closedAt: string | null;
}

export const SEED_BRANCHES: SeedBranch[] = [
  {
    "name": "Arjundhara Branch",
    "incharge": "Om Prakash Karki",
    "contact": "9801708976"
  },
  {
    "name": "Arunkhola Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Bailbas Branch",
    "incharge": "Nanda lal Mahato",
    "contact": "9854036982"
  },
  {
    "name": "Baluwatar Branch",
    "incharge": "Ambika Nepal",
    "contact": "9802353963"
  },
  {
    "name": "Belbari Branch",
    "incharge": "Rudra bajgai",
    "contact": "9801417863"
  },
  {
    "name": "Bhedabari Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Bhutaha/Bardaghat Branch",
    "incharge": "Ramchandra Koirala",
    "contact": "9801599137"
  },
  {
    "name": "Biratchowk Branch",
    "incharge": "Rudra bajgai",
    "contact": "9801417863"
  },
  {
    "name": "Bolochowk Branch",
    "incharge": "Sujan Oli",
    "contact": "9801614711"
  },
  {
    "name": "Budhabare Branch",
    "incharge": "om Prakash karki",
    "contact": "9801708976"
  },
  {
    "name": "Bulingtar Branch",
    "incharge": "Dut Bahadur Birkatta",
    "contact": "9849596029"
  },
  {
    "name": "Chormara Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Damak Branch",
    "incharge": "Rabin Pokhrel",
    "contact": "9705417902"
  },
  {
    "name": "Damauli Branch",
    "incharge": "Amrit Bhattrai",
    "contact": "9714524181"
  },
  {
    "name": "Dhangadhi Branch",
    "incharge": "Santosh prasad Bhatta",
    "contact": "9801827198"
  },
  {
    "name": "Dudhe Branch",
    "incharge": "Madan Adhikari",
    "contact": "9801417740"
  },
  {
    "name": "Dumkibas Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Gaidakot Branch",
    "incharge": "Bijaya Chaudhary",
    "contact": "9801975185"
  },
  {
    "name": "Gajehada Branch",
    "incharge": "Bimal Poudel",
    "contact": "9705855123"
  },
  {
    "name": "Gokarna Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Goldhap Branch",
    "incharge": "Saroj Regmi",
    "contact": "9801615077"
  },
  {
    "name": "Hupsikot Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Itahari Branch",
    "incharge": "Dinesh karki",
    "contact": "9705417905"
  },
  {
    "name": "Jitpur Branch",
    "incharge": "Bimal Poudel",
    "contact": "9705855123"
  },
  {
    "name": "Kanchan Branch",
    "incharge": "Bimal Poudel",
    "contact": "9705855123"
  },
  {
    "name": "Katari Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Kawasoti Branch",
    "incharge": "Madhav sir",
    "contact": "9802890048"
  },
  {
    "name": "Kerabari Branch",
    "incharge": "Rudra bajgai",
    "contact": "9801417863"
  },
  {
    "name": "Kerkha Branch",
    "incharge": "Rabin Pokhrel",
    "contact": "9705417902"
  },
  {
    "name": "Lolang Branch",
    "incharge": "Ambika Nepal",
    "contact": "9802353963"
  },
  {
    "name": "Machhapokhari Branch",
    "incharge": "Ambika Nepal",
    "contact": "9802353963"
  },
  {
    "name": "Narayangarh Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Pathari Branch (All)",
    "incharge": "Umesh sir",
    "contact": "9709162008"
  },
  {
    "name": "Pharsatikar Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Pithauli Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Pokhara Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Rajhar/Daldale Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Sundar-Bazzar Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Sunwal Branch",
    "incharge": "Sujan sir",
    "contact": "9801567344"
  },
  {
    "name": "Sworna Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Thankot Branch",
    "incharge": "",
    "contact": ""
  },
  {
    "name": "Operation HQ",
    "incharge": "Surendra",
    "contact": ""
  }
];

export const SEED_TICKETS: SeedTicket[] = [
  {
    "sn": "1",
    "branchName": "Itahari Branch",
    "category": "Sales",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "iptv box navayra new connection pending",
    "description": "[Incharge: dinesh karkai | Contact: 9705417905]\niptv box navayra new connection pending",
    "resolution": "Action Taken: forwarded stock department | Remarks: iptv box no stock",
    "createdAt": "2026-09-08 15:14:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "2",
    "branchName": "Sundar-Bazzar Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "net stable china slow issue",
    "description": "[Incharge: sanddep hamal]\nnet stable china slow issue",
    "resolution": "Action Taken: forwarded noc team | Remarks: staff and noc team coordination",
    "createdAt": "2026-09-08 15:22:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "3",
    "branchName": "Pharsatikar Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "IN_PROGRESS",
    "subject": "need for fiber 5 km",
    "description": "[Incharge: sandeep yadav | Contact: 9857011582]\nneed for fiber 5 km",
    "resolution": "Action Taken: forwaedwd stock department | Remarks: fiber no stock",
    "createdAt": "2026-09-08 15:34:00",
    "closedAt": null
  },
  {
    "sn": "4",
    "branchName": "Kerabari Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "machine bigreko arko machine pathauna",
    "description": "[Incharge: raj pardan | Contact: 9801417863]\nmachine bigreko arko machine pathauna",
    "resolution": "Action Taken: forwaedwd stock department | Remarks: solve",
    "createdAt": "2026-09-08 15:46:00",
    "closedAt": "2026-09-15 18:00:00"
  },
  {
    "sn": "5",
    "branchName": "Kawasoti Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "fiber ma isuue need 3/4 k.m fiber",
    "description": "[Incharge: madav puri | Contact: 9802890048]\nfiber ma isuue need 3/4 k.m fiber",
    "resolution": "Action Taken: forwaedwd stock department | Remarks: fiber received",
    "createdAt": "2026-09-08 16:10:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "6",
    "branchName": "Pithauli Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "net solw issue",
    "description": "[Incharge: dipa mahato | Contact: 9801563552]\nnet solw issue",
    "resolution": "Action Taken: forwarded noc team | Remarks: staff and noc team coordination solve",
    "createdAt": "2026-09-08 16:42:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "7",
    "branchName": "Gokarna Branch",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "bike tyre change garana napayra pending work",
    "description": "[Incharge: ranoj bhandari | Contact: 9707079586]\nbike tyre change garana napayra pending work",
    "resolution": "Action Taken: forward finance team | Remarks: tyre change garana 4k lagaxa ray inform group ma me",
    "createdAt": "2026-09-08 16:50:00",
    "closedAt": "2026-09-08 18:00:00"
  },
  {
    "sn": "",
    "branchName": "Operation HQ",
    "category": "Others",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "sabi branch bata net slow ko isuue aako cha",
    "description": "sabi branch bata net slow ko isuue aako cha",
    "resolution": "Action Taken: forward noc team | Remarks: noc team saga bujada 2/3 din aagadi ko problem vannu vayo",
    "createdAt": "2026-09-08 10:00:00",
    "closedAt": "2026-09-08 18:00:00"
  },
  {
    "sn": "",
    "branchName": "Dhangadhi Branch",
    "category": "Others",
    "priority": "High",
    "status": "CLOSED",
    "subject": "dhagadi branch ko chitije sir aja bata kam aaudina vannu vako cha",
    "description": "dhagadi branch ko chitije sir aja bata kam aaudina vannu vako cha",
    "resolution": "Action Taken: forward operation and finace team | Remarks: join next  company",
    "createdAt": "2026-09-08 10:00:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "8",
    "branchName": "Dudhe Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "machine bigreko repaire need",
    "description": "[Incharge: sabin miss | Contact: 9801417740]\nmachine bigreko repaire need",
    "resolution": "Action Taken: receivdd head office | Remarks: solve ashok sir",
    "createdAt": "2026-09-08 17:37:00",
    "closedAt": "2026-09-08 18:00:00"
  },
  {
    "sn": "9",
    "branchName": "Katari Branch",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "bidut lay new pol halana lagay ko new pol ma fiber sarnay kam hudai ch...",
    "description": "[Incharge: binita miss]\nbidut lay new pol halana lagay ko new pol ma fiber sarnay kam hudai cha",
    "resolution": "Remarks: complect work",
    "createdAt": "2026-09-09 10:33:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "10",
    "branchName": "Thankot Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "net stable china slow issue and deposit issue",
    "description": "[Incharge: suresh shrestha | Contact: 9801909027]\nnet stable china slow issue and deposit issue",
    "resolution": "Action Taken: forward noc team and finace team | Remarks: no issue this time",
    "createdAt": "2026-09-09 10:44:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "11",
    "branchName": "Pokhara Branch",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "zc 521 router ma maximum slow issue and new connection ko lagi offer d...",
    "description": "[Incharge: amrita miss | Contact: 9802855177]\nzc 521 router ma maximum slow issue and new connection ko lagi offer demand and marekting",
    "resolution": "Action Taken: forwarded stock department | Remarks: inform ashok sir",
    "createdAt": "2026-09-09 11:10:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "12",
    "branchName": "Kerabari Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "huwai router ma problem",
    "description": "[Incharge: sangita rai miss | Contact: 9709116136]\nhuwai router ma problem",
    "resolution": "Action Taken: forward noc team | Remarks: coordination noc team",
    "createdAt": "2026-09-09 11:28:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "13",
    "branchName": "Jitpur Branch",
    "category": "Technical / Network Issue",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "jitpur network ma issue vayara repair hunay kam hudai cha",
    "description": "[Incharge: bimla ji | Contact: 98601975185]\njitpur network ma issue vayara repair hunay kam hudai cha",
    "resolution": null,
    "createdAt": "2026-09-09 11:38:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "14",
    "branchName": "Sundar-Bazzar Branch",
    "category": "Hardware and Equipment",
    "priority": "High",
    "status": "CLOSED",
    "subject": "kuncha bijay pur olt vako  ghar ma ups ma problem vaya ko lay",
    "description": "[Incharge: sandeep hamal | Contact: 9802802332]\nkuncha bijay pur olt vako  ghar ma ups ma problem vaya ko lay",
    "resolution": "Action Taken: forwarded stock department | Remarks: solved",
    "createdAt": "2026-09-09 11:48:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "15",
    "branchName": "Bailbas Branch",
    "category": "Technical / Network Issue",
    "priority": "High",
    "status": "CLOSED",
    "subject": "net slow issue maximum coustumer /price issue new connection effect",
    "description": "[Incharge: Nanda lal Mahato | Contact: 9854036982]\nnet slow issue maximum coustumer /price issue new connection effect",
    "resolution": "Action Taken: forward noc team | Remarks: coordination noc team",
    "createdAt": "2026-09-09 11:58:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "16",
    "branchName": "Bhutaha/Bardaghat Branch",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "new connection offer demend",
    "description": "[Incharge: Ramchandra Koirala | Contact: 9801599137]\nnew connection offer demend",
    "resolution": "Remarks: closed",
    "createdAt": "2026-09-09 12:09:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "17",
    "branchName": "Sunwal Branch",
    "category": "Technical / Network Issue",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "new slow issue and bhabhindar sir and ramchandra sir filed vigit",
    "description": "[Incharge: Sujan sir | Contact: 9801567344]\nnew slow issue and bhabhindar sir and ramchandra sir filed vigit",
    "resolution": "Action Taken: forward noc team | Remarks: coordination noc team",
    "createdAt": "2026-09-09 12:27:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "18",
    "branchName": "Pathari Branch (All)",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "machine tools need c date router problem",
    "description": "[Incharge: umesh sir | Contact: 9709162008]\nmachine tools need c date router problem",
    "resolution": "Action Taken: forwarded stock department | Remarks: c data problem solve",
    "createdAt": "2026-09-09 13:08:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "19",
    "branchName": "Itahari Branch",
    "category": "Hardware and Equipment",
    "priority": "Medium",
    "status": "IN_PROGRESS",
    "subject": "machine demand  inform rajesh sir",
    "description": "[Incharge: dinesh karkai | Contact: 9705417905]\nmachine demand  inform rajesh sir",
    "resolution": "Action Taken: forwarded stock department",
    "createdAt": "2026-09-09 14:23:00",
    "closedAt": null
  },
  {
    "sn": "20",
    "branchName": "Belbari Branch",
    "category": "Hardware and Equipment",
    "priority": "High",
    "status": "IN_PROGRESS",
    "subject": "need fiber trumn link and camera ko lagi",
    "description": "[Incharge: dipeka gurung | Contact: 9801559067]\nneed fiber trumn link and camera ko lagi",
    "resolution": null,
    "createdAt": "2026-09-09 14:35:00",
    "closedAt": null
  },
  {
    "sn": "21",
    "branchName": "Dhangadhi Branch",
    "category": "HR / ADMIN",
    "priority": "High",
    "status": "CLOSED",
    "subject": "need new sfaff",
    "description": "[Incharge: sanosh ji | Contact: 9801827198]\nneed new sfaff",
    "resolution": "Action Taken: forwarded stock department",
    "createdAt": "2026-09-09 14:51:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "22",
    "branchName": "Machhapokhari Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "need staff staff navayara power mantian kam pending",
    "description": "[Incharge: ambika madam | Contact: 9802353963]\nneed staff staff navayara power mantian kam pending",
    "resolution": null,
    "createdAt": "2026-09-09 16:30:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "23",
    "branchName": "Damak Branch",
    "category": "Revenue",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "last time 5500  ma conecction vako yearly7500 vayara renew ma problem",
    "description": "[Incharge: saru madam | Contact: 9705417902]\nlast time 5500  ma conecction vako yearly7500 vayara renew ma problem",
    "resolution": "Action Taken: forward finace team | Remarks: cooradination finance team and solve",
    "createdAt": "2026-09-09 16:37:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "24",
    "branchName": "Goldhap Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "net slow issue maximum coutumer",
    "description": "[Incharge: sumtira miss | Contact: 9801615077]\nnet slow issue maximum coutumer",
    "resolution": "Action Taken: forward noc team | Remarks: noc team saga bujada power isssue",
    "createdAt": "2026-09-09 16:50:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "25",
    "branchName": "Gaidakot Branch",
    "category": "Technical / Network Issue",
    "priority": "High",
    "status": "CLOSED",
    "subject": "morning time 7.30 to 8.00 time net slow",
    "description": "[Incharge: indu madam | Contact: 9801975185]\nmorning time 7.30 to 8.00 time net slow",
    "resolution": "Action Taken: forward noc team | Remarks: noc team saga any desk diyara checking",
    "createdAt": "2026-09-09 16:55:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "26",
    "branchName": "Budhabare Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "3 time call garay ko received vayana",
    "description": "[Incharge: om Prakash karki | Contact: 9705472085]\n3 time call garay ko received vayana",
    "resolution": null,
    "createdAt": "2026-09-09 16:57:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "27",
    "branchName": "Dudhe Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "call not received",
    "description": "[Incharge: sabina madam | Contact: 9801417740]\ncall not received",
    "resolution": "Remarks: voli follow up hunaxa kina call received navako raiax",
    "createdAt": "2026-09-09 17:00:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "28",
    "branchName": "Arjundhara Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "call not received",
    "description": "[Incharge: Om Prakash Karki | Contact: 9801708976]\ncall not received",
    "resolution": "Remarks: voli follow up hunaxa kina call received navako raiax",
    "createdAt": "2026-09-09 17:03:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "29",
    "branchName": "Kawasoti Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "no complain",
    "description": "[Incharge: madav puri sir | Contact: 9802890048]\nno complain",
    "resolution": "Remarks: voli follow up hunaxa kina call received navako raiax",
    "createdAt": "2026-09-09 17:05:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "30",
    "branchName": "Sworna Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "no  call received",
    "description": "[Incharge: saugat sir]\nno  call received",
    "resolution": null,
    "createdAt": "2026-09-09 17:06:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "",
    "branchName": "Operation HQ",
    "category": "Technical / Network Issue",
    "priority": "High",
    "status": "CLOSED",
    "subject": "jati pani branch lai follow up vayo maximum branc bata new slow ko iss...",
    "description": "jati pani branch lai follow up vayo maximum branc bata new slow ko issue dheari aako cha",
    "resolution": "Action Taken: forward noc team | Remarks: noc team lay branch saga cooradinatomn garanu huncha vanny answer ayo",
    "createdAt": "2026-09-09 17:12:00",
    "closedAt": "2026-09-09 18:00:00"
  },
  {
    "sn": "31",
    "branchName": "Narayangarh Branch",
    "category": "Hardware and Equipment",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "hejo ko chtayang lay fan bigayako co need fan",
    "description": "[Incharge: surendra shrestha | Contact: 9802999467]\nhejo ko chtayang lay fan bigayako co need fan",
    "resolution": "Action Taken: forward stock team | Remarks: noraml saman change",
    "createdAt": "2026-09-10 10:10:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "32",
    "branchName": "Gaidakot Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "joro aako lay leave ma hunuhuncha",
    "description": "[Incharge: indu madam | Contact: 9847291366]\njoro aako lay leave ma hunuhuncha",
    "resolution": null,
    "createdAt": "2026-09-10 10:12:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "33",
    "branchName": "Sundar-Bazzar Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "bike ma problem aaya ko kam pending",
    "description": "[Incharge: sandeep hamal | Contact: 9802802332]\nbike ma problem aaya ko kam pending",
    "resolution": "Action Taken: forward finace team | Remarks: solve vayo",
    "createdAt": "2026-09-10 10:18:00",
    "closedAt": "2026-09-18 18:00:00"
  },
  {
    "sn": "34",
    "branchName": "Damak Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "2 ta machine ma issue vayera maintanance garna kathmandu pathayako chh...",
    "description": "[Incharge: Rabin Pokhrel | Contact: 9849507810]\n2 ta machine ma issue vayera maintanance garna kathmandu pathayako chha kura bujera agadi badauna paryo",
    "resolution": "Action Taken: forward stock depertement | Remarks: mother board change garna 30k lagnay vayra exchange garany kura vako raixa ashok sir saga machine board ma cha aauna time lagax",
    "createdAt": "2026-09-10 10:40:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "35",
    "branchName": "Budhabare Branch",
    "category": "HR / ADMIN",
    "priority": "Urgent",
    "status": "IN_PROGRESS",
    "subject": "salary 10% badayra aaunay kura vko thyo ray sandeep sir saga badayra a...",
    "description": "[Incharge: om Prakash karki | Contact: 9705472085]\nsalary 10% badayra aaunay kura vko thyo ray sandeep sir saga badayra aayana vanay kam ma aaudina vandai hunuhucha ray aru no issue",
    "resolution": "Action Taken: forward finance tem",
    "createdAt": "2026-09-10 12:10:00",
    "closedAt": null
  },
  {
    "sn": "36",
    "branchName": "Dudhe Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "iptv box navayra new connection pending and net slow issue",
    "description": "[Incharge: sabina madam | Contact: 9815908884]\niptv box navayra new connection pending and net slow issue",
    "resolution": "Action Taken: forward noc team an d stock team",
    "createdAt": "2026-09-10 12:23:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "3",
    "branchName": "Arjundhara Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "no isuue and new connection kasari badaunay plan garanu vanay ko chu",
    "description": "[Incharge: Om Prakash Karki | Contact: 9801614734]\nno isuue and new connection kasari badaunay plan garanu vanay ko chu",
    "resolution": null,
    "createdAt": "2026-09-10 12:30:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "37",
    "branchName": "Sworna Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "call received navayara group ma inform garay ko chu",
    "description": "[Incharge: saugat sir | Contact: 9814559509]\ncall received navayara group ma inform garay ko chu",
    "resolution": null,
    "createdAt": "2026-09-10 12:49:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "38",
    "branchName": "Pokhara Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "chindada ko olt ma chatyang parako belama otl nai damage hunay vayako ...",
    "description": "[Incharge: romal sir | Contact: 9827969905]\nchindada ko olt ma chatyang parako belama otl nai damage hunay vayako lay  earthing garanu parxa vannu vako cha",
    "resolution": "Action Taken: forward stock depertement | Remarks: saman pathuda yata bata sagai pathidinu hunxa",
    "createdAt": "2026-09-10 12:57:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "39",
    "branchName": "Bulingtar Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "bulingtar office ko lagi ups and bettry need",
    "description": "[Incharge: Dut Bahadur Birkatta | Contact: 9849596029]\nbulingtar office ko lagi ups and bettry need",
    "resolution": "Action Taken: forward stock depertement | Remarks: solve",
    "createdAt": "2026-09-10 13:10:00",
    "closedAt": "2026-09-22 18:00:00"
  },
  {
    "sn": "40",
    "branchName": "Damauli Branch",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "router pathauda 2.4g pathunu vannu vayo and paheal ko vanda net slow",
    "description": "[Incharge: amrit sir | Contact: 9714524181]\nrouter pathauda 2.4g pathunu vannu vayo and paheal ko vanda net slow",
    "resolution": "Action Taken: forwward stock ad noc team | Remarks: 2.4g router out off stocked ana inform net slow issue inform noc",
    "createdAt": "2026-09-10 13:49:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "41",
    "branchName": "Jitpur Branch",
    "category": "Hardware and Equipment",
    "priority": "Medium",
    "status": "IN_PROGRESS",
    "subject": "kanchna jitpurt gagheda barnck ko lagi odtr 1 pic",
    "description": "[Incharge: bimal sir | Contact: 9705855123]\nkanchna jitpurt gagheda barnck ko lagi odtr 1 pic",
    "resolution": "Action Taken: forwward stock ad noc team",
    "createdAt": "2026-09-10 15:30:00",
    "closedAt": null
  },
  {
    "sn": "42",
    "branchName": "Sunwal Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "dimond kater need",
    "description": "dimond kater need",
    "resolution": "Action Taken: forwward stock ad noc team",
    "createdAt": "2026-09-10 16:10:00",
    "closedAt": "2026-09-15 18:00:00"
  },
  {
    "sn": "43",
    "branchName": "Pathari Branch (All)",
    "category": "Hardware and Equipment",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "purchaed bike damak bata sandeep sir lay pathunu vako",
    "description": "[Incharge: umesh sir | Contact: 9709162008]\npurchaed bike damak bata sandeep sir lay pathunu vako",
    "resolution": "Action Taken: forwward stock ad noc team | Remarks: team lai bike navayara pathunu vako",
    "createdAt": "2026-09-10 17:32:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "44",
    "branchName": "Damauli Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "ghar janu vayako lay aja leave ma hunuhuncha",
    "description": "[Incharge: Amrit Bhattrai | Contact: 9714524181]\nghar janu vayako lay aja leave ma hunuhuncha",
    "resolution": "Action Taken: inform me",
    "createdAt": "2026-09-11 10:33:00",
    "closedAt": "2026-09-11 18:00:00"
  },
  {
    "sn": "45",
    "branchName": "Pokhara Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "family problem vayara 1 week leave ma hunuhuncha[26 to 3]",
    "description": "[Incharge: amrita miss]\nfamily problem vayara 1 week leave ma hunuhuncha[26 to 3]",
    "resolution": "Action Taken: mail and inform me | Remarks: mail and inform me",
    "createdAt": "2026-09-11 10:45:00",
    "closedAt": "2026-09-11 18:00:00"
  },
  {
    "sn": "46",
    "branchName": "Sworna Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "IN_PROGRESS",
    "subject": "epone 16 port olt ko thu ma xpone 16 port ko olt demnad and zc 521 5g ...",
    "description": "[Incharge: saugat sir | Contact: 9814559509]\nepone 16 port olt ko thu ma xpone 16 port ko olt demnad and zc 521 5g ma net slow issu",
    "resolution": "Action Taken: forward stock depertement | Remarks: yo kura paheal rajesh sir saga pani vako thyo vannu vako cha",
    "createdAt": "2026-09-11 11:03:00",
    "closedAt": null
  },
  {
    "sn": "47",
    "branchName": "Pathari Branch (All)",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "wifi 5 router ma connect and disconnect proglam so exchange demand",
    "description": "[Incharge: Umesh sir | Contact: 9709162008]\nwifi 5 router ma connect and disconnect proglam so exchange demand",
    "resolution": "Action Taken: forward stock depertement",
    "createdAt": "2026-09-11 11:10:00",
    "closedAt": "2026-09-11 18:00:00"
  },
  {
    "sn": "48",
    "branchName": "Dudhe Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "dudhe to kakani link down fiber navayar aja pani link up hunna vannu v...",
    "description": "[Incharge: Madan Adhikari | Contact: 9801417740]\ndudhe to kakani link down fiber navayar aja pani link up hunna vannu vako cha so 1 km fiber emegency need",
    "resolution": "Action Taken: forward stock depertement | Remarks: sandeep sir lay manage fiber solve problem",
    "createdAt": "2026-09-11 11:20:00",
    "closedAt": "2026-09-11 18:00:00"
  },
  {
    "sn": "49",
    "branchName": "Katari Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "mirchiya ko swich din ma 2/3 patak remoot hunay vayako lay net ma issu...",
    "description": "[Incharge: bijay dai]\nmirchiya ko swich din ma 2/3 patak remoot hunay vayako lay net ma issue",
    "resolution": "Action Taken: forward ashok sir to sunil sir | Remarks: staff banauna janu vako cha vanny inform aako thyo  so",
    "createdAt": "2026-09-11 11:36:00",
    "closedAt": "2026-09-11 18:00:00"
  },
  {
    "sn": "50",
    "branchName": "Narayangarh Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "gaidakot brncha ma issue vayakolay staff teta janu vako cha",
    "description": "[Incharge: surendra shrestha | Contact: 9802899467]\ngaidakot brncha ma issue vayakolay staff teta janu vako cha",
    "resolution": "Remarks: solve",
    "createdAt": "2026-09-11 12:13:00",
    "closedAt": "2026-09-11 18:00:00"
  },
  {
    "sn": "51",
    "branchName": "Kanchan Branch",
    "category": "Billing",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "presonal scoketi usge demand service charge",
    "description": "presonal scoketi usge demand service charge",
    "resolution": "Action Taken: forward stock depertement",
    "createdAt": "2026-09-11 12:31:00",
    "closedAt": "2026-09-11 18:00:00"
  },
  {
    "sn": "52",
    "branchName": "Gaidakot Branch",
    "category": "Technical / Network Issue",
    "priority": "High",
    "status": "CLOSED",
    "subject": "pargatinagar to bharatpur link down",
    "description": "[Incharge: Bijaya Chaudhary | Contact: 9801975185]\npargatinagar to bharatpur link down",
    "resolution": "Action Taken: inform the gaidakot staff | Remarks: solve",
    "createdAt": "2026-09-11 12:35:00",
    "closedAt": "2026-09-10 18:00:00"
  },
  {
    "sn": "53",
    "branchName": "Gaidakot Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "joro aako lay aja pani ofiice aaunu vayana",
    "description": "[Incharge: Bijaya Chaudhary | Contact: 9801975185]\njoro aako lay aja pani ofiice aaunu vayana",
    "resolution": "Action Taken: inform me | Remarks: solve",
    "createdAt": "2026-09-11 13:40:00",
    "closedAt": "2026-09-11 18:00:00"
  },
  {
    "sn": "54",
    "branchName": "Bulingtar Branch",
    "category": "Others",
    "priority": "Low",
    "status": "IN_PROGRESS",
    "subject": "bulingtar office fron desk ko lagi office decoration garanay demand",
    "description": "[Incharge: Dut Bahadur Birkatta | Contact: 9849596029]\nbulingtar office fron desk ko lagi office decoration garanay demand",
    "resolution": null,
    "createdAt": "2026-09-11 13:55:00",
    "closedAt": null
  },
  {
    "sn": "55",
    "branchName": "Pathari Branch (All)",
    "category": "HR / ADMIN",
    "priority": "High",
    "status": "IN_PROGRESS",
    "subject": "ashesh dhamal staff ko bike ko full engin badanu parnay vaya ko 10 to ...",
    "description": "[Incharge: Umesh sir | Contact: 9709162008]\nashesh dhamal staff ko bike ko full engin badanu parnay vaya ko 10 to 15k kharcha aaunay vayako lay office lay half payment ko request garanu vako cha",
    "resolution": "Action Taken: forward finace team",
    "createdAt": "2026-09-11 14:04:00",
    "closedAt": null
  },
  {
    "sn": "56",
    "branchName": "Pithauli Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "net slow issue",
    "description": "[Incharge: manish mahato]\nnet slow issue",
    "resolution": "Action Taken: forward noc team | Remarks: satrurday ko issue ko corrdinaton noc team",
    "createdAt": "2026-09-13 10:11:00",
    "closedAt": "2026-09-13 18:00:00"
  },
  {
    "sn": "57",
    "branchName": "Thankot Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "scooter accident vaayara aja 1 day rest ma hunuhuncha out off office w...",
    "description": "[Incharge: lasta miss]\nscooter accident vaayara aja 1 day rest ma hunuhuncha out off office work time",
    "resolution": "Action Taken: inform me",
    "createdAt": "2026-09-13 10:28:00",
    "closedAt": "2026-09-13 18:00:00"
  },
  {
    "sn": "58",
    "branchName": "Jitpur Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "IN_PROGRESS",
    "subject": "2 ta shine bill book nai xaina and 3 year renew fail",
    "description": "[Incharge: Bimal Poudel | Contact: 9705855123]\n2 ta shine bill book nai xaina and 3 year renew fail",
    "resolution": "Action Taken: forward finace team",
    "createdAt": "2026-09-13 10:35:00",
    "closedAt": null
  },
  {
    "sn": "59",
    "branchName": "Jitpur Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "IN_PROGRESS",
    "subject": "jitpur brancha ma db box ko kam vayako lay ladder need",
    "description": "[Incharge: Bimal Poudel | Contact: 9705855123]\njitpur brancha ma db box ko kam vayako lay ladder need",
    "resolution": "Action Taken: forward stock team",
    "createdAt": "2026-09-13 10:45:00",
    "closedAt": null
  },
  {
    "sn": "60",
    "branchName": "Bhutaha/Bardaghat Branch",
    "category": "Hardware and Equipment",
    "priority": "High",
    "status": "IN_PROGRESS",
    "subject": "tvs scooketi bill book xaina",
    "description": "[Incharge: Ramchandra Koirala | Contact: 9801599137]\ntvs scooketi bill book xaina",
    "resolution": null,
    "createdAt": "2026-09-13 10:55:00",
    "closedAt": null
  },
  {
    "sn": "61",
    "branchName": "Gaidakot Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "aja ra voli pani bida ma hunuhuna cha tej manauna maita janu vako cha ...",
    "description": "[Incharge: indu madam]\naja ra voli pani bida ma hunuhuna cha tej manauna maita janu vako cha ray",
    "resolution": "Action Taken: hari sir lai inform garanu vako cha ray",
    "createdAt": "2026-09-13 11:05:00",
    "closedAt": "2026-09-13 18:00:00"
  },
  {
    "sn": "62",
    "branchName": "Kanchan Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "id card navayara filed ma kam garana garo vako cha ray",
    "description": "[Incharge: manisha miss]\nid card navayara filed ma kam garana garo vako cha ray",
    "resolution": "Action Taken: banaunu vandiya ko chu",
    "createdAt": "2026-09-13 11:13:00",
    "closedAt": "2026-09-13 18:00:00"
  },
  {
    "sn": "63",
    "branchName": "Pokhara Branch",
    "category": "Technical / Network Issue",
    "priority": "High",
    "status": "CLOSED",
    "subject": "shiva ganga to chindada ma new pol halnay kam vayakolay morning time b...",
    "description": "[Incharge: romal sir]\nshiva ganga to chindada ma new pol halnay kam vayakolay morning time bata kam garanu vako cha staff lay",
    "resolution": "Action Taken: inform me and group | Remarks: solve",
    "createdAt": "2026-09-13 11:17:00",
    "closedAt": "2026-09-13 18:00:00"
  },
  {
    "sn": "64",
    "branchName": "Kerabari Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "new receptionist join alina rai",
    "description": "[Incharge: Rudra bajgai | Contact: 9801417863]\nnew receptionist join alina rai",
    "resolution": "Action Taken: inform hr dep | Remarks: mail operations and finace group",
    "createdAt": "2026-09-13 11:24:00",
    "closedAt": "2026-09-13 18:00:00"
  },
  {
    "sn": "65",
    "branchName": "Pharsatikar Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "IN_PROGRESS",
    "subject": "shine bike no bill book",
    "description": "[Incharge: sandeep sir]\nshine bike no bill book",
    "resolution": null,
    "createdAt": "2026-09-13 11:39:00",
    "closedAt": null
  },
  {
    "sn": "66",
    "branchName": "Budhabare Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "machine problem repair need",
    "description": "[Incharge: pabitra miss]\nmachine problem repair need",
    "resolution": "Action Taken: forward stock team",
    "createdAt": "2026-09-13 12:09:00",
    "closedAt": "2026-09-13 18:00:00"
  },
  {
    "sn": "67",
    "branchName": "Bolochowk Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "sabai thik cha no issue",
    "description": "[Incharge: Sujan Oli | Contact: 9801614711]\nsabai thik cha no issue",
    "resolution": null,
    "createdAt": "2026-09-13 14:19:00",
    "closedAt": "2026-09-13 18:00:00"
  },
  {
    "sn": "68",
    "branchName": "Bhutaha/Bardaghat Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "bida ma ghar aaunu vako cha ghar aako bela ma pithuali brnch visit",
    "description": "[Incharge: Ramchandra Koirala | Contact: 9801599137]\nbida ma ghar aaunu vako cha ghar aako bela ma pithuali brnch visit",
    "resolution": "Action Taken: inform me",
    "createdAt": "2026-09-14 10:04:00",
    "closedAt": "2026-09-14 18:00:00"
  },
  {
    "sn": "69",
    "branchName": "Pokhara Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "hajurbuwa bitnu vako 1 year ko kam ma janu parnay vayako lay",
    "description": "[Incharge: romal sir]\nhajurbuwa bitnu vako 1 year ko kam ma janu parnay vayako lay",
    "resolution": "Action Taken: inform me",
    "createdAt": "2026-09-14 10:07:00",
    "closedAt": "2026-09-14 18:00:00"
  },
  {
    "sn": "70",
    "branchName": "Gokarna Branch",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "kageswori mandir ma program huna lagay ko lay 1 week ko lagi net free ...",
    "description": "[Incharge: ranoj bhadari]\nkageswori mandir ma program huna lagay ko lay 1 week ko lagi net free ma dinu  vanny demand",
    "resolution": "Action Taken: inform finance team",
    "createdAt": "2026-09-14 11:02:00",
    "closedAt": "2026-09-18 18:00:00"
  },
  {
    "sn": "71",
    "branchName": "Dudhe Branch",
    "category": "Hardware and Equipment",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "machine head office received",
    "description": "[Incharge: Madan Adhikari | Contact: 9801417740]\nmachine head office received",
    "resolution": "Action Taken: inform stock dep and me | Remarks: machine ashok sir lay banayara stock team lau dudhay branch pathunu vayo",
    "createdAt": "2026-09-14 23:25:00",
    "closedAt": "2026-09-16 18:00:00"
  },
  {
    "sn": "72",
    "branchName": "Kawasoti Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "IN_PROGRESS",
    "subject": "tvs radeon bike  ko no bill book used filed",
    "description": "[Incharge: Madhav sir | Contact: 9802890048]\ntvs radeon bike  ko no bill book used filed",
    "resolution": "Action Taken: inform finance team",
    "createdAt": "2026-09-14 23:43:00",
    "closedAt": null
  },
  {
    "sn": "73",
    "branchName": "Sundar-Bazzar Branch",
    "category": "Hardware and Equipment",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "bike number ga 11 pa 4024 tyre change garanu parnay",
    "description": "[Incharge: sandep hamal]\nbike number ga 11 pa 4024 tyre change garanu parnay",
    "resolution": "Action Taken: inform finance team | Remarks: solve",
    "createdAt": "2026-09-14 11:53:00",
    "closedAt": "2026-09-19 18:00:00"
  },
  {
    "sn": "74",
    "branchName": "Katari Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "kaki ko death vayara 13 din kam sakayra matra office aaunu hunxa",
    "description": "[Incharge: kiran sir]\nkaki ko death vayara 13 din kam sakayra matra office aaunu hunxa",
    "resolution": "Action Taken: inform me with call me",
    "createdAt": "2026-09-14 12:01:00",
    "closedAt": "2026-09-14 18:00:00"
  },
  {
    "sn": "75",
    "branchName": "Narayangarh Branch",
    "category": "Customer Complain",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "red light vayara staff gaidakot janu vako cha",
    "description": "[Incharge: surendra shrestha]\nred light vayara staff gaidakot janu vako cha",
    "resolution": null,
    "createdAt": "2026-09-14 12:25:00",
    "closedAt": "2026-09-14 18:00:00"
  },
  {
    "sn": "76",
    "branchName": "Kawasoti Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "40 kilo ma main link down",
    "description": "[Incharge: Madhav sir | Contact: 9802890048]\n40 kilo ma main link down",
    "resolution": "Action Taken: inform  kawasoti team with madav sir | Remarks: solve",
    "createdAt": "2026-09-14 16:45:00",
    "closedAt": "2026-09-14 18:00:00"
  },
  {
    "sn": "77",
    "branchName": "Itahari Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "buspark to line chock samma ko line  hejo beluka bata down",
    "description": "[Incharge: Dinesh karki | Contact: 9705417905]\nbuspark to line chock samma ko line  hejo beluka bata down",
    "resolution": "Action Taken: inform me | Remarks: solve",
    "createdAt": "2026-09-15 10:15:00",
    "closedAt": "2026-09-15 18:00:00"
  },
  {
    "sn": "78",
    "branchName": "Pokhara Branch",
    "category": "Hardware and Equipment",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "bike bill book renew garnay time vayo vannu vako cha",
    "description": "[Incharge: romal sir]\nbike bill book renew garnay time vayo vannu vako cha",
    "resolution": "Action Taken: inform group and me | Remarks: time milayara garnu vandiya ko chu",
    "createdAt": "2026-09-15 10:21:00",
    "closedAt": "2026-09-18 18:00:00"
  },
  {
    "sn": "79",
    "branchName": "Itahari Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "kiran rai new staff leave ma hunucha personal work",
    "description": "[Incharge: Dinesh karki | Contact: 9705417905]\nkiran rai new staff leave ma hunucha personal work",
    "resolution": "Action Taken: inform me",
    "createdAt": "2026-09-15 10:33:00",
    "closedAt": "2026-09-15 18:00:00"
  },
  {
    "sn": "80",
    "branchName": "Gaidakot Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "aja pani office aauna let huncha vannu vako cha",
    "description": "[Incharge: indu madam]\naja pani office aauna let huncha vannu vako cha",
    "resolution": "Action Taken: group ma mess garanu vanay garanu vako xaina",
    "createdAt": "2026-09-15 11:40:00",
    "closedAt": "2026-09-15 18:00:00"
  },
  {
    "sn": "81",
    "branchName": "Kawasoti Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "voli bata kawasoti branch ma fiber change ko kam hudai cha vako fiber ...",
    "description": "[Incharge: Madhav sir | Contact: 9802890048]\nvoli bata kawasoti branch ma fiber change ko kam hudai cha vako fiber ma problem aayar",
    "resolution": "Action Taken: call me and voli kam strded vaya paxi group ma inform garanu hunxa | Remarks: change fiber solve",
    "createdAt": "2026-09-15 12:44:00",
    "closedAt": "2026-09-16 18:00:00"
  },
  {
    "sn": "82",
    "branchName": "Dudhe Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "IN_PROGRESS",
    "subject": "dudhe to kankai nagarpailka samma fiber 6 k.m old fiber vayara  32/33 ...",
    "description": "[Incharge: Madan Adhikari | Contact: 9801417740]\ndudhe to kankai nagarpailka samma fiber 6 k.m old fiber vayara  32/33 ota tifiln box vayako lay maxixum link problem",
    "resolution": "Action Taken: forward stock team",
    "createdAt": "2026-09-15 13:10:00",
    "closedAt": null
  },
  {
    "sn": "83",
    "branchName": "Dhangadhi Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "chitije sir lay kam xodanu vaya ra salary and hisav ko kura garanu vak...",
    "description": "[Incharge: Santosh prasad Bhatta | Contact: 9801827198]\nchitije sir lay kam xodanu vaya ra salary and hisav ko kura garanu vako cha",
    "resolution": "Action Taken: forward finace team | Remarks: solve",
    "createdAt": "2026-09-15 13:17:00",
    "closedAt": "2026-00-15 18:00:00"
  },
  {
    "sn": "84",
    "branchName": "Sunwal Branch",
    "category": "Technical / Network Issue",
    "priority": "High",
    "status": "CLOSED",
    "subject": "net slow issue",
    "description": "[Incharge: Sujan sir | Contact: 9801567344]\nnet slow issue",
    "resolution": "Action Taken: forward noc team | Remarks: coordination noc team",
    "createdAt": "2026-09-15 14:05:00",
    "closedAt": "2026-09-15 18:00:00"
  },
  {
    "sn": "85",
    "branchName": "Katari Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "family problem  leave hunuhuncha",
    "description": "[Incharge: binita miss]\nfamily problem  leave hunuhuncha",
    "resolution": "Action Taken: mail and mess me",
    "createdAt": "2026-09-16 11:25:00",
    "closedAt": "2026-09-16 18:00:00"
  },
  {
    "sn": "86",
    "branchName": "Budhabare Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "no issue",
    "description": "[Incharge: om Prakash karki | Contact: 9801708976]\nno issue",
    "resolution": "Action Taken: followup normal",
    "createdAt": "2026-09-16 12:23:00",
    "closedAt": "2026-09-16 18:00:00"
  },
  {
    "sn": "87",
    "branchName": "Thankot Branch",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "dashai offer kahealay aauxa vannu vako thyo",
    "description": "[Incharge: suresh sir]\ndashai offer kahealay aauxa vannu vako thyo",
    "resolution": "Action Taken: forward finace team | Remarks: ary sabi thik cha no complen",
    "createdAt": "2026-09-16 13:39:00",
    "closedAt": "2026-09-16 18:00:00"
  },
  {
    "sn": "88",
    "branchName": "Pathari Branch (All)",
    "category": "Hardware and Equipment",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "router change ma problem 3/4 month vako coustumer ko router ma problem...",
    "description": "[Incharge: Umesh sir | Contact: 9709162008]\nrouter change ma problem 3/4 month vako coustumer ko router ma problem aaya k garanay sir vannu vako cha",
    "resolution": "Action Taken: forwadd stock team",
    "createdAt": "2026-09-16 13:44:00",
    "closedAt": "2026-09-16 18:00:00"
  },
  {
    "sn": "89",
    "branchName": "Kerkha Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "no issue this time",
    "description": "[Incharge: Rabin Pokhrel | Contact: 9705417902]\nno issue this time",
    "resolution": "Action Taken: call me",
    "createdAt": "2026-09-16 14:10:00",
    "closedAt": "2026-09-16 18:00:00"
  },
  {
    "sn": "90",
    "branchName": "Goldhap Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "baba birami vayar hospital janu parnay vayako lay leave ma hunuhucha",
    "description": "[Incharge: Saroj Regmi | Contact: 9801615077]\nbaba birami vayar hospital janu parnay vayako lay leave ma hunuhucha",
    "resolution": "Action Taken: mail and inform me",
    "createdAt": "2026-09-16 14:34:00",
    "closedAt": "2026-09-16 18:00:00"
  },
  {
    "sn": "91",
    "branchName": "Pathari Branch (All)",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "IN_PROGRESS",
    "subject": "bike kp full engin badayko kharcha 13600 aako cha office lay payment n...",
    "description": "[Incharge: Umesh sir | Contact: 9709162008]\nbike kp full engin badayko kharcha 13600 aako cha office lay payment nadiya aba bata aarko bike khojanu vandai hunuhuncha",
    "resolution": "Action Taken: inform finace team | Remarks: office bata service ko payment dinay garayko xaina raiaxa",
    "createdAt": "2026-09-17 11:59:00",
    "closedAt": null
  },
  {
    "sn": "92",
    "branchName": "Katari Branch",
    "category": "Technical / Network Issue",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "bidut lay new pol halana lagay ko new pol ma fiber sarnay kam aja pani...",
    "description": "[Incharge: Bijaya Chaudhary]\nbidut lay new pol halana lagay ko new pol ma fiber sarnay kam aja pani   hudai cha",
    "resolution": "Action Taken: inform me",
    "createdAt": "2026-09-17 12:08:00",
    "closedAt": "2026-09-17 18:00:00"
  },
  {
    "sn": "93",
    "branchName": "Kawasoti Branch",
    "category": "Hardware and Equipment",
    "priority": "High",
    "status": "CLOSED",
    "subject": "wifi6 gpone model zr-ac120r connect disconnect problem and no range pr...",
    "description": "[Incharge: Madhav sir | Contact: 9802890048]\nwifi6 gpone model zr-ac120r connect disconnect problem and no range probllem",
    "resolution": "Action Taken: inform noc team | Remarks: coordination noc team and solve",
    "createdAt": "2026-09-17 13:14:00",
    "closedAt": "2026-09-17 18:00:00"
  },
  {
    "sn": "94",
    "branchName": "Budhabare Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "chec up ko lagi ktm janu parnay vayako lay bida ma hunuhucha date[4 to...",
    "description": "[Incharge: om Prakash karki | Contact: 9801708976]\nchec up ko lagi ktm janu parnay vayako lay bida ma hunuhucha date[4 to 9]",
    "resolution": "Action Taken: inform me and mail",
    "createdAt": "2026-09-18 10:35:00",
    "closedAt": "2026-09-18 18:00:00"
  },
  {
    "sn": "95",
    "branchName": "Jitpur Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "machine serviceing ko  time vayara head office pathunu vako cha",
    "description": "[Incharge: Bimal Poudel | Contact: 9705855123]\nmachine serviceing ko  time vayara head office pathunu vako cha",
    "resolution": "Action Taken: inform stock team | Remarks: received head office",
    "createdAt": "2026-09-18 10:56:00",
    "closedAt": "2026-09-18 18:00:00"
  },
  {
    "sn": "96",
    "branchName": "Damauli Branch",
    "category": "Others",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "no issue",
    "description": "[Incharge: Amrit Bhattrai | Contact: 9714524181]\nno issue",
    "resolution": "Action Taken: call me",
    "createdAt": "2026-09-18 12:55:00",
    "closedAt": "2026-09-18 18:00:00"
  },
  {
    "sn": "97",
    "branchName": "Damak Branch",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "damak tera ko branch ma yati bela issue xaina vannu vayo sabi normal c...",
    "description": "[Incharge: sandeep bohora sir | Contact: 9705417902]\ndamak tera ko branch ma yati bela issue xaina vannu vayo sabi normal cha",
    "resolution": "Action Taken: call me",
    "createdAt": "2026-09-18 15:52:00",
    "closedAt": "2026-09-18 18:00:00"
  },
  {
    "sn": "98",
    "branchName": "Kanchan Branch",
    "category": "Sales",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "kanchan branch ma new conncetion 7500 ma garana garo hunaxa price ma k...",
    "description": "[Incharge: Bimal Poudel | Contact: 9705855123]\nkanchan branch ma new conncetion 7500 ma garana garo hunaxa price ma kahi kam vaya websurfer ko  coustumer sifting garana sajilo hunthyo demand",
    "resolution": "Action Taken: inform finance team",
    "createdAt": "2026-09-20 10:23:00",
    "closedAt": "2026-09-20 18:00:00"
  },
  {
    "sn": "99",
    "branchName": "Kawasoti Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "staff haru fiber tanna lagay ko lay complan herana ko lagi pithauli ba...",
    "description": "[Incharge: Madhav sir | Contact: 9802890048]\nstaff haru fiber tanna lagay ko lay complan herana ko lagi pithauli bata narayan bastola janu vako cha",
    "resolution": "Action Taken: inform me call",
    "createdAt": "2026-09-20 10:55:00",
    "closedAt": "2026-09-20 18:00:00"
  },
  {
    "sn": "100",
    "branchName": "Thankot Branch",
    "category": "Sales",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "dashai offer kahealay aauxa vannu vako cha",
    "description": "[Incharge: suresh sir]\ndashai offer kahealay aauxa vannu vako cha",
    "resolution": "Action Taken: inform me call",
    "createdAt": "2026-09-20 11:00:00",
    "closedAt": "2026-09-20 18:00:00"
  },
  {
    "sn": "101",
    "branchName": "Bailbas Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "net slow issue",
    "description": "[Incharge: Nanda lal Mahato | Contact: 9854036982]\nnet slow issue",
    "resolution": "Action Taken: inform noc team | Remarks: noc team saga call ma bujada 2/4 din aagi ko issue ho sir vannu vayo",
    "createdAt": "2026-09-20 11:10:00",
    "closedAt": "2026-09-20 18:00:00"
  },
  {
    "sn": "102",
    "branchName": "Goldhap Branch",
    "category": "Hardware and Equipment",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "desktop ko display gayara kam pending",
    "description": "[Incharge: Saroj Regmi | Contact: 9801615077]\ndesktop ko display gayara kam pending",
    "resolution": "Action Taken: inform stock team | Remarks: banauna ko lagi pathana lako",
    "createdAt": "2026-09-20 11:54:00",
    "closedAt": "2026-09-23 18:00:00"
  },
  {
    "sn": "103",
    "branchName": "Itahari Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "need staff [new staff ghar janu vako aja samma aaunu navaya ko lay aba...",
    "description": "[Incharge: Dinesh karki | Contact: 9705417905]\nneed staff [new staff ghar janu vako aja samma aaunu navaya ko lay aba aaunu hunna ray  ]",
    "resolution": "Action Taken: inform hr",
    "createdAt": "2026-09-20 12:50:00",
    "closedAt": "2026-09-20 18:00:00"
  },
  {
    "sn": "104",
    "branchName": "Pharsatikar Branch",
    "category": "Technical / Network Issue",
    "priority": "High",
    "status": "CLOSED",
    "subject": "net solw issue dherai aako cha",
    "description": "[Incharge: sandeep sir]\nnet solw issue dherai aako cha",
    "resolution": "Action Taken: inform noc team | Remarks: damak sandeep sir pani bujunu vanay ko chu",
    "createdAt": "2026-09-20 16:05:00",
    "closedAt": "2026-09-20 18:00:00"
  },
  {
    "sn": "",
    "branchName": "Operation HQ",
    "category": "Sales",
    "priority": "High",
    "status": "CLOSED",
    "subject": "sabi branch bata dashai offer kahelay bata aauxa vandai hunuhunch",
    "description": "sabi branch bata dashai offer kahelay bata aauxa vandai hunuhunch",
    "resolution": null,
    "createdAt": "2026-09-20 17:05:00",
    "closedAt": "2026-09-20 18:00:00"
  },
  {
    "sn": "105",
    "branchName": "Sundar-Bazzar Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "offfice ma vayako ups ma problem aayako lay new ups need",
    "description": "[Incharge: sandeep hamal]\nofffice ma vayako ups ma problem aayako lay new ups need",
    "resolution": "Action Taken: inform stock team and ashok sir | Remarks: cheking ashok sir",
    "createdAt": "2026-09-21 10:28:00",
    "closedAt": "2026-09-24 18:00:00"
  },
  {
    "sn": "106",
    "branchName": "Sundar-Bazzar Branch",
    "category": "Technical / Network Issue",
    "priority": "High",
    "status": "CLOSED",
    "subject": "net stable xaina vannay complean aako cha",
    "description": "[Incharge: sandeep hamal]\nnet stable xaina vannay complean aako cha",
    "resolution": "Action Taken: inform noc team | Remarks: corradition noc team",
    "createdAt": "2026-09-21 10:42:00",
    "closedAt": "2026-09-21 18:00:00"
  },
  {
    "sn": "107",
    "branchName": "Pokhara Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "chori lai check garna hospital lanu paray ko lay suray rimal bida ma h...",
    "description": "[Incharge: Amrita miss]\nchori lai check garna hospital lanu paray ko lay suray rimal bida ma hunuhuncha",
    "resolution": "Action Taken: inform me  and call",
    "createdAt": "2026-09-22 10:35:00",
    "closedAt": "2026-09-22 18:00:00"
  },
  {
    "sn": "108",
    "branchName": "Katari Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "katari ko staff ghar bata katari branch farkanu vaya ko lay bijay chau...",
    "description": "[Incharge: binita miss]\nkatari ko staff ghar bata katari branch farkanu vaya ko lay bijay chaudari dai aja narayaghat farakadai hunuhucha",
    "resolution": "Action Taken: inform me  and call",
    "createdAt": "2026-09-22 10:50:00",
    "closedAt": "2026-09-22 18:00:00"
  },
  {
    "sn": "109",
    "branchName": "Belbari Branch",
    "category": "Hardware and Equipment",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "fan bigray  ko lay new fan need",
    "description": "[Incharge: Rudra bajgai | Contact: 9801417863]\nfan bigray  ko lay new fan need",
    "resolution": "Action Taken: inform me  and group mess",
    "createdAt": "2026-09-22 11:10:00",
    "closedAt": "2026-09-22 18:00:00"
  },
  {
    "sn": "110",
    "branchName": "Bhutaha/Bardaghat Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "bardaghat and sunwal net slow isuue [7pm to 9pm]ma maximum net slow is...",
    "description": "[Incharge: Ramchandra Koirala | Contact: 9801599137]\nbardaghat and sunwal net slow isuue [7pm to 9pm]ma maximum net slow issue",
    "resolution": "Action Taken: inform noc team | Remarks: corridation noc team",
    "createdAt": "2026-09-22 11:24:00",
    "closedAt": "2026-09-22 18:00:00"
  },
  {
    "sn": "111",
    "branchName": "Gokarna Branch",
    "category": "Hardware and Equipment",
    "priority": "High",
    "status": "CLOSED",
    "subject": "machine ma problrm vayara repair ko lagi dinu vako cha",
    "description": "[Incharge: ranoj bhadari]\nmachine ma problrm vayara repair ko lagi dinu vako cha",
    "resolution": "Action Taken: inform me and group mess",
    "createdAt": "2026-09-23 10:07:00",
    "closedAt": "2026-09-29 18:00:00"
  },
  {
    "sn": "112",
    "branchName": "Itahari Branch",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "ithari ma vako 9168 number ko gadi fiberworld ko name ma namsari vayo",
    "description": "[Incharge: Dinesh karki | Contact: 9705417905]\nithari ma vako 9168 number ko gadi fiberworld ko name ma namsari vayo",
    "resolution": "Action Taken: inform me and group mess | Remarks: solve",
    "createdAt": "2026-09-23 15:30:00",
    "closedAt": "2026-09-23 18:00:00"
  },
  {
    "sn": "113",
    "branchName": "Itahari Branch",
    "category": "Technical / Network Issue",
    "priority": "High",
    "status": "CLOSED",
    "subject": "net 2/4 dina vayo issue problem tiktok messenger ma maxixum slow",
    "description": "[Incharge: Dinesh karki | Contact: 9705417905]\nnet 2/4 dina vayo issue problem tiktok messenger ma maxixum slow",
    "resolution": "Action Taken: inform noc team | Remarks: noc team saga bujada issue xaina vannu vayo",
    "createdAt": "2026-09-24 10:20:00",
    "closedAt": "2026-09-24 18:00:00"
  },
  {
    "sn": "114",
    "branchName": "Bulingtar Branch",
    "category": "Hardware and Equipment",
    "priority": "High",
    "status": "CLOSED",
    "subject": "bulingtar branch office ma back up ko lagi 1ta ups ra bettry aja halan...",
    "description": "[Incharge: Dut Bahadur Birkatta | Contact: 9849596029]\nbulingtar branch office ma back up ko lagi 1ta ups ra bettry aja halanu vayo",
    "resolution": "Action Taken: inform me and group mess | Remarks: solve",
    "createdAt": "2026-09-24 12:42:00",
    "closedAt": "2026-09-24 18:00:00"
  },
  {
    "sn": "115",
    "branchName": "Kanchan Branch",
    "category": "Sales",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "router navayara connection loss vako cha need router",
    "description": "[Incharge: Bimal Poudel | Contact: 9705855123]\nrouter navayara connection loss vako cha need router",
    "resolution": "Action Taken: inform stock team | Remarks: stock dep ma bujda no stock router 2.4g",
    "createdAt": "2026-09-25 11:06:00",
    "closedAt": "2026-10-01 18:00:00"
  },
  {
    "sn": "116",
    "branchName": "Kerabari Branch",
    "category": "Sales",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "router navayara connection hold need router",
    "description": "[Incharge: Rudra bajgai | Contact: 9801417863]\nrouter navayara connection hold need router",
    "resolution": "Action Taken: inform stock team | Remarks: stock dep ma bujda no stock router 2.4g",
    "createdAt": "2026-09-25 11:10:00",
    "closedAt": "2026-10-01 18:00:00"
  },
  {
    "sn": "117",
    "branchName": "Narayangarh Branch",
    "category": "HR / ADMIN",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "katari bata farkay paxi health ma problem vayara rest ma hunuhuncha su...",
    "description": "[Incharge: Bijaya Chaudhary]\nkatari bata farkay paxi health ma problem vayara rest ma hunuhuncha sunday bata join hunuhuncha office",
    "resolution": "Action Taken: inform hr | Remarks: solve",
    "createdAt": "2026-09-25 11:20:00",
    "closedAt": "2026-09-27 18:00:00"
  },
  {
    "sn": "118",
    "branchName": "Jitpur Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "bike ko tyre old vayako lay change garanu parnay",
    "description": "[Incharge: Bimal Poudel | Contact: 9705855123]\nbike ko tyre old vayako lay change garanu parnay",
    "resolution": "Action Taken: inform finance team | Remarks: solve",
    "createdAt": "2026-09-25 12:49:00",
    "closedAt": "2026-09-25 18:00:00"
  },
  {
    "sn": "119",
    "branchName": "Pokhara Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "pokhara brncha ko chinedada olt ma earthing halnay kam complete vayo",
    "description": "[Incharge: romal sir]\npokhara brncha ko chinedada olt ma earthing halnay kam complete vayo",
    "resolution": "Action Taken: imform all | Remarks: solve",
    "createdAt": "2026-09-25 13:21:00",
    "closedAt": "2026-09-25 18:00:00"
  },
  {
    "sn": "120",
    "branchName": "Itahari Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "pathuri chowk bata balgadan chock samma fiber kateko vayara 30 to 35 j...",
    "description": "[Incharge: Dinesh karki | Contact: 9705417905]\npathuri chowk bata balgadan chock samma fiber kateko vayara 30 to 35 jana offline vayako 500m fiber emengency need",
    "resolution": "Action Taken: inform stock dep | Remarks: purchased by manakaman ithari",
    "createdAt": "2026-09-27 11:20:00",
    "closedAt": "2026-09-27 18:00:00"
  },
  {
    "sn": "",
    "branchName": "Operation HQ",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "visit new branch amrasa branch",
    "description": "visit new branch amrasa branch",
    "resolution": null,
    "createdAt": "2026-09-27 14:39:00",
    "closedAt": "2026-09-27 18:00:00"
  },
  {
    "sn": "121",
    "branchName": "Narayangarh Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "bijay chaudari dai ko realative death vaya ko sagar gayara office aaud...",
    "description": "[Incharge: surendra shrestha]\nbijay chaudari dai ko realative death vaya ko sagar gayara office aauda dhala hunaxa vannu vako cha",
    "resolution": "Action Taken: imform me | Remarks: solve",
    "createdAt": "2026-09-28 10:05:00",
    "closedAt": "2026-09-27 18:00:00"
  },
  {
    "sn": "122",
    "branchName": "Katari Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "rati bata line gayako lay back up down vaya ko lay jenerator vada ma l...",
    "description": "[Incharge: binita miss]\nrati bata line gayako lay back up down vaya ko lay jenerator vada ma linu paraxa vannu vako cha",
    "resolution": "Action Taken: inform group and call me | Remarks: kahi time wait garay paxi 1/2 hourma line aayo no usge jenerator",
    "createdAt": "2026-09-28 10:00:00",
    "closedAt": "2026-09-27 18:00:00"
  },
  {
    "sn": "123",
    "branchName": "Pokhara Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "wifi 6 gpone model zr-ac120 r ma net solw issue and time time afai aau...",
    "description": "[Incharge: romal sir]\nwifi 6 gpone model zr-ac120 r ma net solw issue and time time afai aaunay janay hunay problem",
    "resolution": "Action Taken: inform noc dep | Remarks: new wifi 6replace ko lagi pathjunu vako cha stock team bata",
    "createdAt": "2026-09-28 10:39:00",
    "closedAt": "2026-09-27 18:00:00"
  },
  {
    "sn": "124",
    "branchName": "Gaidakot Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "national id card banauna janu parnay vaya ko lay 1.30 hour ko lagi kaw...",
    "description": "[Incharge: Bijaya Chaudhary | Contact: 9801975185]\nnational id card banauna janu parnay vaya ko lay 1.30 hour ko lagi kawasoti janu vako cha",
    "resolution": "Action Taken: inform me",
    "createdAt": "2026-09-28 10:50:00",
    "closedAt": "2026-09-27 18:00:00"
  },
  {
    "sn": "",
    "branchName": "Operation HQ",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "sabi branch bata dashai offer kahelay bata aauxa vandai hunuhunch",
    "description": "sabi branch bata dashai offer kahelay bata aauxa vandai hunuhunch",
    "resolution": "Action Taken: inform me call",
    "createdAt": "2026-09-29 10:56:00",
    "closedAt": "2026-09-29 18:00:00"
  },
  {
    "sn": "125",
    "branchName": "Gaidakot Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "OPEN",
    "subject": "morning time 7to 8 and night 8 to 9 pm ma net slow issue complean",
    "description": "[Incharge: Bijaya Chaudhary | Contact: 9801975185]\nmorning time 7to 8 and night 8 to 9 pm ma net slow issue complean",
    "resolution": "Action Taken: inform noc team",
    "createdAt": "2026-09-29 11:00:00",
    "closedAt": null
  },
  {
    "sn": "",
    "branchName": "Kanchan Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "IN_PROGRESS",
    "subject": "hamero kanchan bardaghat pharsatikar kawasoti bill book navaya ko bike...",
    "description": "hamero kanchan bardaghat pharsatikar kawasoti bill book navaya ko bike  and scoketi filed ma ushe vako cha ashok sir rajesh sir",
    "resolution": null,
    "createdAt": "2026-09-29 11:03:00",
    "closedAt": null
  },
  {
    "sn": "126",
    "branchName": "Itahari Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "machine ma problem aaya ko k problem ho dekhaun launu vako cha  d-teac...",
    "description": "[Incharge: Dinesh karki | Contact: 9705417905]\nmachine ma problem aaya ko k problem ho dekhaun launu vako cha  d-teach ma",
    "resolution": "Action Taken: inform stock team",
    "createdAt": "2026-09-29 11:18:00",
    "closedAt": "2026-09-29 18:00:00"
  },
  {
    "sn": "127",
    "branchName": "Pathari Branch (All)",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "ups ma problem",
    "description": "[Incharge: Umesh sir | Contact: 9709162008]\nups ma problem",
    "resolution": "Action Taken: inform stock team  and ashok sir | Remarks: loose conection ko issue ho banaunu paraxa vannu vayo ashok sir lay thie inform gariya ko chu pathari umesh sir lai",
    "createdAt": "2026-09-29 11:41:00",
    "closedAt": "2026-09-29 18:00:00"
  },
  {
    "sn": "128",
    "branchName": "Bulingtar Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "familay problem vayara aja bida ma hunuhuncha",
    "description": "[Incharge: dud bhadur]\nfamilay problem vayara aja bida ma hunuhuncha",
    "resolution": "Action Taken: inform me | Remarks: solve",
    "createdAt": "2026-09-29 11:56:00",
    "closedAt": "2026-09-29 18:00:00"
  },
  {
    "sn": "129",
    "branchName": "Narayangarh Branch",
    "category": "Sales",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "new connection ko lagi fiber tannu parayko lay narayghat ko staff gaid...",
    "description": "new connection ko lagi fiber tannu parayko lay narayghat ko staff gaidakot janu vako cha",
    "resolution": "Action Taken: inform me | Remarks: solve",
    "createdAt": "2026-09-29 00:02:00",
    "closedAt": "2026-09-29 18:00:00"
  },
  {
    "sn": "130",
    "branchName": "Bulingtar Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "IN_PROGRESS",
    "subject": "palpa ma vayako battery ma problem aayar net ma problem so need bettry",
    "description": "[Incharge: Dut Bahadur Birkatta | Contact: 9849596029]\npalpa ma vayako battery ma problem aayar net ma problem so need bettry",
    "resolution": "Action Taken: inform stock team",
    "createdAt": "2026-09-30 10:13:00",
    "closedAt": null
  },
  {
    "sn": "131",
    "branchName": "Kerkha Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "kerka branch ma 800 m fiber tanayo vany 7/8 ota new connection aauxa v...",
    "description": "[Incharge: Rabin Pokhrel | Contact: 9705417902]\nkerka branch ma 800 m fiber tanayo vany 7/8 ota new connection aauxa vannu vako cha",
    "resolution": "Action Taken: infoerm stock team | Remarks: sandeep sir lay call garanu vako thyo",
    "createdAt": "2026-09-30 13:00:00",
    "closedAt": "2026-10-01 18:00:00"
  },
  {
    "sn": "132",
    "branchName": "Pokhara Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "office ma vayako bettry ma problem aayara check garadai hunuhucha",
    "description": "[Incharge: romal sir]\noffice ma vayako bettry ma problem aayara check garadai hunuhucha",
    "resolution": "Action Taken: inform group and call me | Remarks: berrty safa garay paxi problem solve vayo",
    "createdAt": "2026-10-01 10:20:00",
    "closedAt": "2026-10-01 18:00:00"
  },
  {
    "sn": "133",
    "branchName": "Dudhe Branch",
    "category": "Technical / Network Issue",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "net slow issue problem",
    "description": "[Incharge: Madan Adhikari | Contact: 9801417740]\nnet slow issue problem",
    "resolution": "Action Taken: infoerm noc team | Remarks: noc team lay check gardai hunuhuncha",
    "createdAt": "2026-10-01 10:35:00",
    "closedAt": "2026-10-01 18:00:00"
  },
  {
    "sn": "134",
    "branchName": "Kawasoti Branch",
    "category": "Hardware and Equipment",
    "priority": "High",
    "status": "CLOSED",
    "subject": "lamjung chock,sagaramatra tool and 5kattha ma bidhut lay pol sareranay...",
    "description": "[Incharge: Madhav sir | Contact: 9802890048]\nlamjung chock,sagaramatra tool and 5kattha ma bidhut lay pol sareranay ko fiber cut vayako lay morning bata kam vako cha",
    "resolution": "Action Taken: inform me and call",
    "createdAt": "2026-10-01 11:38:00",
    "closedAt": "2026-10-01 18:00:00"
  },
  {
    "sn": "135",
    "branchName": "Narayangarh Branch",
    "category": "Others",
    "priority": "Medium",
    "status": "CLOSED",
    "subject": "db box open  garana janu vako cha",
    "description": "db box open  garana janu vako cha",
    "resolution": null,
    "createdAt": "2026-10-01 14:20:00",
    "closedAt": "2026-10-01 18:00:00"
  },
  {
    "sn": "136",
    "branchName": "Damauli Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "damauli vako ladder vachiya kola lay narayghat branch vako ladder path...",
    "description": "[Incharge: Amrit Bhattrai | Contact: 9714524181]\ndamauli vako ladder vachiya kola lay narayghat branch vako ladder pathako chu",
    "resolution": "Action Taken: inform stock team | Remarks: narayanght ko ladder pathaya ko",
    "createdAt": "2026-10-01 17:30:00",
    "closedAt": "2026-10-01 18:00:00"
  },
  {
    "sn": "137",
    "branchName": "Gaidakot Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "familay problem vayara leave ma hunucha and ngt ko saff gaidakot janu ...",
    "description": "[Incharge: Bijaya Chaudhary | Contact: 9801975185]\nfamilay problem vayara leave ma hunucha and ngt ko saff gaidakot janu vako cha",
    "resolution": "Action Taken: mail and inform me",
    "createdAt": "2026-10-02 10:05:00",
    "closedAt": "2026-10-02 18:00:00"
  },
  {
    "sn": "138",
    "branchName": "Pokhara Branch",
    "category": "Technical / Network Issue",
    "priority": "Medium",
    "status": "IN_PROGRESS",
    "subject": "chauthe radakrishna madiir to belchautra side ma pol shitfing ko kam n...",
    "description": "[Incharge: romal sir]\nchauthe radakrishna madiir to belchautra side ma pol shitfing ko kam nasaikay ko lay morning bata kam hudai cha",
    "resolution": "Action Taken: group mess and call me",
    "createdAt": "2026-10-02 10:22:00",
    "closedAt": null
  },
  {
    "sn": "139",
    "branchName": "Pokhara Branch",
    "category": "Hardware and Equipment",
    "priority": "Urgent",
    "status": "CLOSED",
    "subject": "fiber clever bigaray ko lay need",
    "description": "[Incharge: romal sir]\nfiber clever bigaray ko lay need",
    "resolution": "Action Taken: inform stock team",
    "createdAt": "2026-10-02 17:00:00",
    "closedAt": "2026-10-02 18:00:00"
  },
  {
    "sn": "140",
    "branchName": "Budhabare Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "ghar na sarad vaaya ko office 2bajay samma aaiepugxu vannu vako cha",
    "description": "[Incharge: om Prakash karki | Contact: 9801708976]\nghar na sarad vaaya ko office 2bajay samma aaiepugxu vannu vako cha",
    "resolution": "Action Taken: inform call me",
    "createdAt": "2026-10-04 10:10:00",
    "closedAt": "2026-10-04 18:00:00"
  },
  {
    "sn": "141",
    "branchName": "Gaidakot Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "birami vayara follow up ko lagi hospital janu parnay vayako lay abhira...",
    "description": "[Incharge: Bijaya Chaudhary | Contact: 9801975185]\nbirami vayara follow up ko lagi hospital janu parnay vayako lay abhiral kumal aaunu vako xaina",
    "resolution": "Action Taken: inform call me",
    "createdAt": "2026-10-04 10:22:00",
    "closedAt": "2026-10-04 18:00:00"
  },
  {
    "sn": "142",
    "branchName": "Pokhara Branch",
    "category": "HR / ADMIN",
    "priority": "Low",
    "status": "CLOSED",
    "subject": "hejo office ma kam vayako lay aaunu vako thyo aja bida ma hunuhucha",
    "description": "hejo office ma kam vayako lay aaunu vako thyo aja bida ma hunuhucha",
    "resolution": "Action Taken: inform call me",
    "createdAt": "2026-10-04 10:40:00",
    "closedAt": "2026-10-04 18:00:00"
  }
];

export const seedOperationTicketsData = async (): Promise<void> => {
  try {
    console.log('🎫 Seeding Historical Operation Center Tickets from Excel Log...');

    // 1. Ensure all 41+ branches exist
    const branchMap: Record<string, number> = {};
    for (let i = 0; i < SEED_BRANCHES.length; i++) {
      const b = SEED_BRANCHES[i];
      const cleanName = b.name.trim();
      const baseName = cleanName.replace(/\s+Branch(\s+\(All\))?$/i, '').trim();

      const existing = await db.query(
        `SELECT id, name FROM branches 
         WHERE LOWER(name) = LOWER($1) 
            OR LOWER(name) = LOWER($2) 
            OR LOWER(name) LIKE $3
         LIMIT 1`,
        [cleanName, baseName, `%${baseName.toLowerCase()}%`]
      );

      if (existing.rowCount > 0) {
        branchMap[cleanName] = existing.rows[0].id;
        branchMap[baseName] = existing.rows[0].id;
      } else {
        const code = `BR-${String(i + 1).padStart(3, '0')}`;
        const ins = await db.query(
          `INSERT INTO branches (code, name, contact_number, status, created_at, updated_at)
           VALUES ($1, $2, $3, 'Active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
           ON CONFLICT (code) DO NOTHING
           RETURNING id`,
          [code, cleanName, b.contact || null]
        );

        if (ins.rowCount > 0) {
          branchMap[cleanName] = ins.rows[0].id;
          branchMap[baseName] = ins.rows[0].id;
        } else {
          const fetchAgain = await db.query(`SELECT id FROM branches WHERE code = $1`, [code]);
          if (fetchAgain.rowCount > 0) {
            branchMap[cleanName] = fetchAgain.rows[0].id;
            branchMap[baseName] = fetchAgain.rows[0].id;
          }
        }
      }
    }

    // Default fallback branch (Operation HQ or first branch)
    let fallbackBranchId = branchMap['Operation HQ'];
    if (!fallbackBranchId) {
      const firstBranch = await db.query(`SELECT id FROM branches ORDER BY id ASC LIMIT 1`);
      if (firstBranch.rowCount > 0) {
        fallbackBranchId = firstBranch.rows[0].id;
      }
    }

    // 2. Identify created_by and closed_by user
    let userRes = await db.query(
      `SELECT id FROM users WHERE LOWER(username) = 'surendra' OR LOWER(full_name) LIKE '%surendra%' LIMIT 1`
    );
    let userId: number;
    if (userRes.rowCount > 0) {
      userId = userRes.rows[0].id;
    } else {
      const adminRes = await db.query(
        `SELECT id FROM users WHERE role = 'SUPER_ADMIN' OR username = 'superadmin' ORDER BY id ASC LIMIT 1`
      );
      if (adminRes.rowCount > 0) {
        userId = adminRes.rows[0].id;
      } else {
        const firstUser = await db.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`);
        if (firstUser.rowCount === 0) {
          console.log('⚠️ No users found in database yet. Skipping operation tickets seed.');
          return;
        }
        userId = firstUser.rows[0].id;
      }
    }

    // 3. Insert tickets idempotently
    let insertedCount = 0;
    for (const t of SEED_TICKETS) {
      const branchId = branchMap[t.branchName] || branchMap[t.branchName.replace(/\s+Branch(\s+\(All\))?$/i, '').trim()] || fallbackBranchId;

      if (!branchId) {
        continue;
      }

      // Check if already seeded
      const chk = await db.query(
        `SELECT id FROM operation_tickets WHERE branch_id = $1 AND subject = $2 AND created_at = $3 LIMIT 1`,
        [branchId, t.subject, t.createdAt]
      );

      if (chk.rowCount > 0) {
        continue;
      }

      const insTicket = await db.query(
        `INSERT INTO operation_tickets (
           branch_id, created_by, category, priority, subject, description,
           status, resolution, closed_by, closed_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          branchId,
          userId,
          t.category,
          t.priority,
          t.subject,
          t.description,
          t.status,
          t.resolution || null,
          t.status === 'CLOSED' ? userId : null,
          t.closedAt || null,
          t.createdAt,
          t.closedAt || t.createdAt,
        ]
      );

      if (insTicket.rowCount > 0) {
        insertedCount++;
        const ticketId = insTicket.rows[0].id;

        // Add timeline updates
        await db.query(
          `INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
           VALUES ($1, $2, 'CREATED', 'Ticket logged from Branch Operations report', NULL, 'OPEN', $3)`,
          [ticketId, userId, t.createdAt]
        );

        if (t.status === 'IN_PROGRESS') {
          await db.query(
            `INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
             VALUES ($1, $2, 'STATUS_CHANGE', $3, 'OPEN', 'IN_PROGRESS', $4)`,
            [ticketId, userId, t.resolution || 'Marked In Progress by Operations team', t.createdAt]
          );
        } else if (t.status === 'CLOSED') {
          await db.query(
            `INSERT INTO operation_ticket_updates (ticket_id, user_id, update_type, message, old_status, new_status, created_at)
             VALUES ($1, $2, 'CLOSED', $3, 'OPEN', 'CLOSED', $4)`,
            [ticketId, userId, t.resolution ? `Resolution: ${t.resolution}` : 'Closed by Operations', t.closedAt || t.createdAt]
          );
        }
      }
    }

    console.log(`✅ Successfully seeded ${insertedCount} historical operation tickets into database.`);
  } catch (err: any) {
    console.error('⚠️ Warning during operation tickets seed:', err.message);
  }
};

// Allow direct CLI execution if run directly via ts-node or node
if (require.main === module) {
  (async () => {
    try {
      await db.init();
      await seedOperationTicketsData();
      process.exit(0);
    } catch (e: any) {
      console.error(e);
      process.exit(1);
    }
  })();
}
