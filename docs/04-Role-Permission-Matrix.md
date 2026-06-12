# Role Permission Matrix

## 1. Purpose

This document defines the permissions and access levels for all user roles within the Annual Operating Plan (AOP) application.

The purpose of this document is to establish clear ownership, access boundaries, approval authorities, and editing permissions for each role.

---

## 2. Roles

* AOP - Division Member
* AOP - Division Director
* AOP - Strategy Team
* AOP - PMO
* AOP - Procurement Team
* AOP - Executive Director
* AOP - Director General

---

## 3. Screen Access Matrix

| Screen             | Division Member | Division Director | Strategy Team | PMO | Procurement Team | Executive Director | Director General |
| ------------------ | --------------- | ----------------- | ------------- | --- | ---------------- | ------------------ | ---------------- |
| Dashboard          | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Create Activity    | ✓               | ✗                 | ✗             | ✗   | ✗                | ✗                  | ✗                |
| Division Overview  | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Sector Overview    | ✗               | ✗                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Activity Lead      | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Activities List    | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Approvals          | ✗               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Procurement Plans  | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Engagement Plans   | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Financial Spending | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |

---

## 4. Activity Permissions

| Permission      | Division Member               | Division Director       | Strategy Team  | PMO                 | Procurement Team                                   | Executive Director | Director General |
| --------------- | ----------------------------- | ----------------------- | -------------- | ------------------- | -------------------------------------------------- | ------------------ | ---------------- |
| Create Activity | ✓                             | ✗                       | ✗              | ✗                   | ✗                                                  | ✗                  | ✗                |
| Edit Activity   | Own Division Draft Activities | Own Division Activities | All Activities | Classification Only | No (Only Perform CRUD in Procurement Plan Section) | No                 | No               |
| Delete Activity | Own Division Draft Activities | ✗                       | ✗              | ✗                   | ✗                                                  | ✗                  | ✗                |
| Submit Activity | ✓                             | ✗                       | ✗              | ✗                   | ✗                                                  | ✗                  | ✗                |
| View Activity   | Division                      | Division                | All            | All                 | All                                                | Sector             | All              |
| Export Activity | ✓                             | ✓                       | ✓              | ✓                   | ✓                                                  | ✓                  | ✓                |

---

## 5. Planning Approval Permissions

| Action                     | Division Director | Strategy Team | PMO | Procurement Team | Executive Director | Director General |
| -------------------------- | ----------------- | ------------- | --- | ---------------- | ------------------ | ---------------- |
| Approve Activity           | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Raise Clarification        | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Send To Executive Director | ✗                 | ✓             | ✓   | ✓                | ✗                  | ✗                |

---

## 6. Execution Approval Permissions

| Action                     | Division Director | Strategy Team | PMO | Procurement Team | Executive Director | Director General |
| -------------------------- | ----------------- | ------------- | --- | ---------------- | ------------------ | ---------------- |
| Approve Execution Update   | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✗                |
| Raise Clarification        | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✗                |
| Send To Executive Director | ✗                 | ✓             | ✗   | ✗                | ✗                  | ✗                |

---

## 7. Procurement Permissions

| Permission              | Division Member | Division Director | Strategy Team | PMO | Procurement Team | Executive Director | Director General |
| ----------------------- | --------------- | ----------------- | ------------- | --- | ---------------- | ------------------ | ---------------- |
| View Procurement Plans  | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Create Procurement Plan | ✓               | ✓                 | ✓             | ✗   | ✓                | ✗                  | ✗                |
| Update Procurement Plan | ✓               | ✓                 | ✓             | ✗   | ✓                | ✗                  | ✗                |
| Delete Procurement Plan | ✓               | ✓                 | ✓             | ✗   | ✓                | ✗                  | ✗                |

---

## 8. Milestone Permissions

| Permission       | Division Member | Division Director | Strategy Team | PMO | Procurement Team | Executive Director | Director General |
| ---------------- | --------------- | ----------------- | ------------- | --- | ---------------- | ------------------ | ---------------- |
| View Milestones  | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Create Milestone | ✓               | ✓                 | ✓             | ✗   | ✗                | ✗                  | ✗                |
| Update Milestone | ✓               | ✓                 | ✓             | ✗   | ✗                | ✗                  | ✗                |
| Delete Milestone | ✓               | ✓                 | ✓             | ✗   | ✗                | ✗                  | ✗                |

---

## 9. Engagement Plan Permissions

| Permission              | Division Member | Division Director | Strategy Team | PMO | Procurement Team | Executive Director | Director General |
| ----------------------- | --------------- | ----------------- | ------------- | --- | ---------------- | ------------------ | ---------------- |
| View Engagement Plans   | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Create Engagement Plan  | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Update Engagement Plan  | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Delete Engagement Plan  | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Export Engagement Plans | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |

### Business Rules

* Engagement plans can be created by any role at any time.
* Only owner, strategy team can edit/delete engagement plan.

---

## 10. Budget Permissions

| Permission     | Division Member | Division Director | Strategy Team | PMO | Procurement Team | Executive Director | Director General |
| -------------- | --------------- | ----------------- | ------------- | --- | ---------------- | ------------------ | ---------------- |
| View Budgets   | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |
| Create Budget  | ✓               | ✓                 | ✓             | ✗   | ✗                | ✗                  | ✗                |
| Edit Budget    | ✓               | ✓                 | ✓             | ✗   | ✗                | ✗                  | ✗                |
| Delete Budget  | ✓               | ✓                 | ✓             | ✗   | ✗                | ✗                  | ✗                |
| Export Budgets | ✓               | ✓                 | ✓             | ✓   | ✓                | ✓                  | ✓                |

---

## 11. Field Level Permissions

### Strategy Team

Can edit:

* All activity fields
* Planning fields
* Execution fields
* Budgets
* Milestones
* Dependencies
* Team Members
* Procurement Plans
* Engagement Plans

Can perform edits regardless of activity status.

### PMO

Can edit:

* Activity Classification

Cannot edit:

* Any other activity field

### Procurement Team

Can edit:

* Procurement Plans

Cannot edit:

* Activity Information
* Budgets
* Milestones
* Dependencies
* Engagement Plans
* Execution Updates

---

## 12. Clarification Permissions

### Business Rules

* Clarification comments are mandatory.
* Clarification history must be maintained.
* Clarification history is visible to authorized users.
* Activities return to the designated workflow owner after clarification.

---

## 13. Data Visibility Rules

### Division Member

Can view:

* Activities belonging to assigned division.

### Division Director

Can view:

* Activities belonging to assigned division.

### Executive Director

Can view:

* Activities belonging to assigned sector.

### Strategy Team

Can view:

* All activities.

### PMO

Can view:

* All activities.

### Procurement Team

Can view:

* All activities.

### Director General

Can view:

* All activities.

---

## NOTE

Approval actions shall be governed by the Approval Workflow Specification document.