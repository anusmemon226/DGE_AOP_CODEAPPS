# Screen 3: Create Activity

## 1. Screen Information

### Screen Name

Create Activity

### Module

Annual Operating Plan (AOP)

### Purpose

The Create Activity screen allows AOP - Division Member users to create a new AOP activity within the selected cycle.

Users can create activity information and subsequently manage related information such as team members, dependencies, budgets, milestones, procurement plans and engagement plans.

---

## 2. Common Layout

This screen uses the Common Application Layout defined in the Common Application Layout section.

---

## 3. Accessible Roles

### Allowed Roles

* AOP - Division Member

### Restricted Roles

* AOP - Division Director
* AOP - Strategy Team
* AOP - PMO
* AOP - Procurement Team
* AOP - Executive Director
* AOP - Director General

---

## 4. Screen Layout

### Header Section

#### Display

* Activity Name – Displayed dynamically based on user input.
* Approval Status – Default value shall be displayed as Draft.
* Activity Phase – Default value shall be displayed as Planning.
* Pending With – Display the current activity owner. Upon creation, the owner shall be the currently logged-in AOP - Division Member.
* Save Draft (Button)

### Body Section

Users shall be able to create activities using one of the following methods:

* Manual Activity Creation

In manual user also can upload document 

* AI-Assisted Activity Creation

The AI-assisted option shall provide a conversational Copilot-style interface where users can answer guided questions and optionally upload supporting documents. Based on the provided information, the system shall generate and populate activity details for user review before saving.

---

## 5. Form Sections

### Activity Information

Stores core activity information (Can add activity information).

---

## 6. Fields

### Activity Information Fields

#### Activity Information

| Field                                                     | Type                           | Required | Default Value | Description                                                                                                                                                                                                   |
| --------------------------------------------------------- | ------------------------------ | -------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Activity / Initiative Name                                | Text                           | Yes      | -             |                                                                                                                                                                                                               |
| Activity Type                                             | Choice                         | Yes      | -             | New Project - 1<br>Ongoing Project - 2<br>Contract Operations - 3<br>Internal Operations - 4                                                                                                                  |
| Sector                                                    | Text                           | Yes      | Auto Populate |                                                                                                                                                                                                               |
| Division                                                  | Text                           | Yes      | Auto Populate |                                                                                                                                                                                                               |
| Activity Scope                                            | Choice (Strategic/Operational) | Yes      | -             | Strategic - 1<br>Operational - 2                                                                                                                                                                              |
| What strategy is this project/activity categorized under? | Multi choice                   | No       |               | This field will be visible when Activity scope will Strategic<br><br>Government of the Future Strategy - 576610000<br>DGE Corporate Strategy - 576610001<br>Abu Dhabi Government Digital Strategy - 576610002 |
| Activity Classification                                   | Choice                         | Yes      | -             | EPM Registered Project - 576610000<br>Operational Activity - 576610001<br>Payment Only - 576610002                                                                                                            |
| Does this project require Budget?                         | Choice                         | Yes      | -             | Yes - 1<br>No - 0                                                                                                                                                                                             |
| Does this project require procurement?                    | Choice                         | Yes      | -             | Yes - 1<br>No - 0                                                                                                                                                                                             |
| Execution plan project reported in ADEO                   | Choice                         | Yes      | -             | Yes – 1<br>No - 0                                                                                                                                                                                             |
| Activity Lead / PM Name                                   | Lookup (systemuser)            | Yes      | -             | Dropdown of users                                                                                                                                                                                             |
| Planned Start Date                                        | Date                           | Yes      | -             |                                                                                                                                                                                                               |
| Planned End Date                                          | Date                           | Yes      | -             |                                                                                                                                                                                                               |
| Activity Scope Description                                | Multiline Text                 | Yes      | -             |                                                                                                                                                                                                               |
| Summary                                                   | Multiline Text                 | Yes      | -             |                                                                                                                                                                                                               |

### ADEO Activity Overview

| Field                              | Type           | Required | Default Value |
| ---------------------------------- | -------------- | -------- | ------------- |
| اسم المشروع                        | Text           | Yes      | -             |
| وصف المشروع                        | Text           | Yes      | -             |
| Long Term Impact                   | Multiline Text | Yes      | -             |
| طويلة المدى / اهداف المشروع العامة | Multiline Text | Yes      | -             |
| Stakeholder                        | Text           | Yes      | -             |
| Activity KPI                       | Text           | Yes      | -             |
| Activity Plan (If any)             | Text           | No       | -             |
| Risks                              | Multiline Text | Yes      | -             |

When Execution Plan Project Reported in ADEO = Yes,

All ADEO Activity Overview required fields shall become mandatory and visible.

When Execution Plan Project Reported in ADEO = No

ADEO Activity Overview section will be hidden

---

## 7. Actions

### Save Draft

Creates activity with:

* Approval Status = Draft

On Save activity will be created and redirect to Edit activity form

---

## 8. Business Rules

### Rule 1

Only AOP - Division Member can create activities.

### Rule 2

Activities shall be created against the currently selected cycle.

### Rule 3

Sector and Division shall be automatically populated based on the user's divisional hierarchy.

### Rule 4

Activity shall be saved with Approval Status = Draft.

Activity shall be assigned to the current AOP - Division Member.

### Rule 5

What strategy is this project/activity categorized under? field shall only be visible when Activity Scope = Strategic.

### Rule 7

Upon successful creation:

User shall be redirected to Edit Activity screen.

---

## 9. Validations

* Activity Name must be unique within the selected cycle.
* When activity classification selected value will be Payment Only then Does this project require budget? Will be hidden
* When Does this project require budget? Selected value is no then Does this project require procurement? Field will be disabled and value will auto select No
* When Execution Plan Project Reported to ADEO selected value is No then ADEO Activity Overview Section fields will be hidden and will be visible when Yes
* Planned End Date must be greater than Planned Start Date and Planned Start Date must be lesser than Planned End Date.

### Field Visibility Rules

#### Rule 1

Activity Categorization field shall be visible only when Activity Scope = Strategic.

#### Rule 2

ADEO Activity Overview section shall be visible only when Execution Plan Project Reported in ADEO = Yes.

#### Rule 3

ADEO Activity Overview section shall be hidden when Execution Plan Project Reported in ADEO = No.

#### Rule 4

When Activity Classification = Payment Only, the "Does this project require Budget?" field shall be hidden.

#### Rule 5

When Activity Classification = Payment Only, the system shall automatically consider Budget Required = Yes.

#### Rule 6

When Budget Required = No, Procurement Required shall automatically be set to No and the field shall be disabled.

---

## 11. Save Draft Action

### Save Draft

Upon successful save:

* Activity record shall be created.
* Approval Status shall be set to Draft.
* Activity Phase shall be set to Planning.
* Owner shall be assigned to the current AOP - Division Member.
* Activity creation log shall be generated.
* User shall be redirected to the Edit Activity screen.

---

## 12. Future-Proofing

### Activity Information

Stores core activity information.

Additional activity components such as Team Members, Dependencies, Budgets, Milestones, Procurement Plans, and Engagement Plans shall be managed through the Edit Activity screen after the activity has been created.

---

## 13. Data Sources

### Primary Table

dga_aop_projects

### Related Tables

* Systemuser
* dga_aop_project_logs
* dga_divisional_hierarchy
* dga_assessment_cycle

---

## 14. Success Messages

### Save Draft

Activity created successfully.

---

## 15. Error Messages

Define validation and submission error messages.

---

## 16. Audit Requirements

Create activity log records for:

* Activity Creation