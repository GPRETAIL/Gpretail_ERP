# HRMS feature checklist and build plan

Target: a complete HRMS inside our ERP (Laravel + React, web and mobile), built by us. Frappe HR is the
**functional reference only**.

## Clean-room rule (licence)

Frappe HR is GPL-3.0. We use it only to learn *what* an HRMS should do: its public documentation and
running screens. We do **not** copy, port or translate its code, database tables, field names, screen text,
translations or images. Everything here is written in our own words and designed on our own patterns
(store isolation, `BusinessPermissions`, Form Requests, auto-posted vouchers). Get a short legal check before
selling the module.

Source of the feature list: the Frappe HR documentation index (docs.frappe.io/hr, about 140 pages),
checked 2026-11-04. A local install was tried and could not run: Docker Desktop does not start on this
Windows preview build.

## Where we are today

| Area | We have |
|---|---|
| Employee master | Yes: rich form (personal, department/section/designation, manager, joining date, bank, PF/ESI/UAN, salary mode, week off, working hours, OT flags, hold salary), documents on a private disk, education certificate, grouped summary, store-scoped |
| HR configuration | Departments, sections, designations, plus generic `hr-{type}` lists |
| Attendance | Phase 1 done (2026-11-04): Employee In/Out page, phone check-in with geofence, nightly close |
| Leave | Phase 1 done (2026-11-04): Leave page and mobile Leave screen, policies, ledger, approvals |
| Payroll | Phase 2a done (2026-11-04): Salary Management page, payslips (web and mobile), statutory deductions, posting to accounts |
| Everything below marked "No" | Not built |

Legend: **Have** = exists, **Part** = partly there, **No** = to build. Phase = see the plan at the end.

## 1. Setup and masters

| Feature | What it does | Us | Phase |
|---|---|---|---|
| Departments, designations, sections | Org structure | Have | — |
| Branch / work location | Where an employee works (we use stores and floors) | Part | 1 |
| Employment type | Permanent, contract, trainee, intern… (the employee form's Working Mode) | Part | 1 |
| Employee grade | Grade bands that drive default salary structure and leave policy | No | 2 |
| Employee group | Named groups for bulk actions and notifications | No | 3 |
| Holiday list | Holidays per year per store (copy from last year), weekly offs per employee | Have | — |
| HR settings | Default shift, store location for phone check-in (naming series, retirement age: later) | Part | 2 |
| Organisation chart | Tree view from reporting manager | No | 3 |
| Hierarchy-based access | Managers see only their team (Reports To); HR roles see the store | Have | — |

## 2. Employee lifecycle

| Feature | What it does | Us | Phase |
|---|---|---|---|
| Employee profile | Personal, job, statutory and bank details, documents | Have | — |
| Onboarding | Checklist of tasks (documents, assets, accounts) when someone joins | No | 3 |
| Promotion | Dated designation (and pay) change; writes the employee's classification history | Have | — |
| Transfer | Department/section/floor/location transfer with history; move to another store (copied, login and leave carried) | Have | — |
| Separation / exit | Staff resign (web/phone), manager or HR accepts with the last working day; HR records terminations and retirements; notice shortfall worked out (waivable); relieved on the last day (inactive, login off, nightly); relieving and experience letters (exit checklist: later) | Have | — |
| Exit interview | Reason for leaving, 1–5 ratings, would rejoin, comments; exit report by type, reason and month | Have | — |
| Full and final settlement | One settlement pays the last month's days, earned leave, gratuity and claims, less notice shortfall and the loan balance; posted to the accounts, printable statement; that month's payroll skips the leaver | Have | — |
| Skill map | Skills and ratings per employee | No | 4 |
| Health insurance, other income | Extra profile records used for tax | No | 4 |

## 3. Attendance, shifts and time

| Feature | What it does | Us | Phase |
|---|---|---|---|
| Daily attendance | Present / absent / half-day / on leave / holiday / weekly off per day | Have | — |
| Check-in / check-out log | Raw punches from phone, manager or import (Punch log tab) | Have | — |
| Geolocation and geofence | Distance kept with each punch; phone check-in only within the store's radius | Have | — |
| Auto attendance | Day built from punches and the Working Hour (late after grace, early exit, half day); nightly close | Have | — |
| Attendance tool | Mark or punch many employees for a date (Day board) | Have | — |
| Attendance upload | Import from a spreadsheet (code, date, in, out, status) | Have | — |
| Attendance request | Employee asks to fix a missed punch or mark on duty; manager approves (web and phone) | Have | — |
| Biometric devices | Pull punches from fingerprint / face devices | No | 2 |
| Shift types | Working Hour: start/end, full and half day minutes, grace minutes | Have | — |
| Shift assignment, roster, schedules | Week roster grid, bulk assign by weekday, copy last week, day off (Dynamic weekly off) | Have | — |
| Shift request | Employee asks for a different shift or day off; approval writes the roster | Have | — |
| Overtime | Minutes beyond the shift, approved (fully or partly) in OT Approvals before payroll pays them | Have | — |
| Timesheets | Hours per task/project; payroll from timesheets | No | 4 |
| Daily work summary | Daily email asking staff what they did | No | 4 |

## 4. Leave

| Feature | What it does | Us | Phase |
|---|---|---|---|
| Leave types | CL, SL, EL, LOP by default, editable; paid/unpaid, half day, carry forward, max days | Have | — |
| Leave period and policy | Jan–Dec year; policies with days per type; default policy; set on the employee | Have | — |
| Leave allocation | Automatic on 1 January (pro-rata for joiners, carry forward) and Allocate now | Have | — |
| Leave application | Apply (web and phone), approve/reject with note, withdraw, cancel, notifications | Have | — |
| Leave approver per employee/department | The employee's Reports To; HR can decide for anyone | Have | — |
| Leave ledger | Every credit/debit; balances per employee (Balances tab); ledger API | Have | — |
| Earned leave accrual | Monthly/quarterly automatic credit | No | 2 |
| Compensatory leave | Credit for working on a holiday | No | 2 |
| Leave block days | Dates when leave is not allowed (e.g. festival sales) | No | 2 |
| Leave encashment | HR encashes paid-leave days (up to the balance) into a month's payroll at the day rate; cancel before payroll credits them back | Have | — |
| Leave in salary | Unpaid leave reduces payable days | No | 2 |

## 5. Payroll and statutory (India)

| Feature | What it does | Us | Phase |
|---|---|---|---|
| Salary components | Pay heads (Basic, HRA, Conveyance, Special, OT, Incentive, Batta, Bonus; PF, ESI, PT, Other) and your own | Have | — |
| Salary structure | Lines per structure (% of gross, % of Basic, fixed, balance); employee's Salary Structure and Gross Pay | Have | — |
| Payroll period and settings | Monthly; day rate = days in the month; Monthly or Daily wage | Have | — |
| Payroll run | Prepare from attendance, review, recalculate, submit, mark paid, reopen before payment | Have | — |
| Salary slip | Earnings, deductions, payable/LOP days, net; print/PDF and WhatsApp; My payslips (web, mobile) | Have | — |
| Hold salary | Held slips are calculated but left out of the payment | Have | — |
| Additional salary | One-off earnings/deductions in a month (bonus, fine) | Have | — |
| Arrears and payroll correction | Back-pay after a late revision; fix a submitted month | No | 3 |
| Off-cycle payment | Pay outside the regular run | No | 3 |
| PF, ESI, professional tax | PF (wage ceiling), ESI (gross limit), PT by state with editable slabs; PF/ESI/PT statements (ECR file: later) | Have | — |
| Income tax (TDS) | Old/new regime slabs, declarations, proof submission, monthly TDS | No | 3 |
| Benefits | Flexible benefit plans and claims | No | 4 |
| Incentives, retention bonus | Sales incentive paid through payroll (retention bonus: later) | Part | 3 |
| Gratuity | As per the Act in the full and final settlement: from 5 years (6+ months rounds up), 15/26 × Basic × years, ₹20 lakh cap; editable per store (no provision accounting) | Have | — |
| Bank file | Bank sheet (account, IFSC, amount) with Excel export | Have | — |
| Accounting | Salary journal (with employer PF/ESI and payables) and salary payment vouchers | Have | — |
| Multi-currency | Pay in other currencies | No | — (not needed) |

## 6. Expenses, advances and loans

| Feature | What it does | Us | Phase |
|---|---|---|---|
| Employee advance | Request (self or HR), approve, pay out (cash/bank voucher), recovered from the next salary, never below zero net | Have | — |
| Expense claim | Claim with a bill photo/PDF (private), Reports To or HR approves and picks: with next salary (outside PF/ESI/PT) or pay now (voucher). Single-level approval | Have | — |
| Loans | Interest-free; equal monthly instalments through payroll, skip a month, manual repayment (voucher), auto-closed when repaid | Have | — |
| Travel request | Request and approve travel | No | 4 |
| Vehicle and vehicle log | Company vehicles, fuel and trip logs | No | 4 |

## 7. Recruitment

| Feature | What it does | Us | Phase |
|---|---|---|---|
| Staffing plan and job requisition | Approved headcount and requests for new staff | No | 4 |
| Job opening and job portal | Publish openings, apply online | No | 4 |
| Job applicant | Candidate records and status | No | 4 |
| Interviews | Rounds, types, scheduling, feedback and ratings | No | 4 |
| Job offer and appointment letter | Generate from templates, track acceptance | No | 4 |
| Employee referral | Staff refer candidates | No | 4 |

## 8. Performance

| Feature | What it does | Us | Phase |
|---|---|---|---|
| Appraisal cycle and template | Period, KRAs with weights, rating criteria | No | 4 |
| Goals | Goals linked to KRAs with progress | No | 4 |
| Self-appraisal and feedback | Employee self-rating, manager and peer feedback | No | 4 |
| Appraisal report | Scores across the cycle; feed into promotion | No | 4 |

## 9. Training

| Feature | What it does | Us | Phase |
|---|---|---|---|
| Training programme, event, result, feedback | Plan sessions, attendance, scores, feedback | No | 4 |

## 10. Self-service, mobile and reports

| Feature | What it does | Us | Phase |
|---|---|---|---|
| Mobile check-in/out | With location check (no selfie, by choice) | Have | — |
| Mobile leave apply / approve | Balance, apply, withdraw, approve from phone | Have | — |
| Mobile payslips | View, share on WhatsApp, print/PDF | Have | — |
| Mobile claims and advances | Claims screen: bill from the camera, ask for an advance, balances; managers approve on the Leave screen | Have | — |
| Push / in-app notifications | Leave requests and decisions (reminders for birthdays etc.: later) | Part | 3 |
| HR dashboard | Today's counts on the Day board (a separate dashboard page with payroll cost: later) | Part | 2 |
| Reports | Monthly attendance register and leave balances done; salary register, PF/ESI/PT, bank sheet, TDS, headcount, attrition | Part | 2–3 |

## Phased build plan

Each phase is a separate plan (Plan Mode), with tests, live local verification and its own commits.

1. **Phase 1: Attendance and leave (foundation).** Employment type, holiday lists, shift types, the daily
   attendance engine from punches (late/half-day rules), geofenced mobile check-in, bulk attendance and import,
   leave types/policies/allocation/applications with approvers and a ledger, hierarchy access, HR dashboard and
   the monthly attendance and leave reports. Fills the empty "Employee In/Out" menu item.
2. **Phase 2: Payroll.** Salary components and structures, assignments, payroll run and slips, LOP from
   attendance, overtime, additional salary, PF/ESI/PT, bank sheet, salary register, posting to accounts,
   mobile payslips, shift rosters, attendance/shift requests, biometric import, promotions and transfers.
   Fills the empty "Salary Management" menu item.
3. **Phase 3: Money and exits.** Phase 3a (done): advances, expense claims, loans, leave encashment. Phase 3c (done): separation,
   exit interview, gratuity, full and final settlement. Still to come: TDS with declarations and proofs,
   arrears/corrections, incentives, onboarding.
4. **Phase 4: Talent.** Recruitment, appraisals and goals, training, skill map, benefits, travel and vehicles,
   timesheets, organisation chart.

Open questions before phase 1: statutory scope (all stores in one state, or PT slabs for several states?),
biometric device brands in use, and whether geofence check-in is required for all staff.
