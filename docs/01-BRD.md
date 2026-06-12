# Business Requirements Document (BRD)

# Annual Operating Plan (AOP) System

## 1. Document Information

| Item          | Description                    |
| ------------- | ------------------------------ |
| Project Name  | Annual Operating Plan (AOP)    |
| Document Type | Business Requirements Document |
| Version       | 1.0                            |
| Prepared For  | Internal Government Operations |
| Prepared By   | Datanox                        |
| Status        | Draft                          |

---

## 2. Business Overview

The Annual Operating Plan (AOP) System is designed to manage the complete lifecycle of annual operational planning and execution activities across government divisions and sectors.

The system enables planning, approval, execution monitoring, procurement planning, engagement planning, financial spending tracking, and performance oversight through a structured workflow involving multiple organizational roles.

The application operates through annual cycles and supports both Planning and Execution phases at the activity level.

---

## 3. Business Objectives

The objectives of the AOP System are:

* Digitize the annual planning and execution process.
* Standardize activity submission and approval workflows.
* Improve visibility of divisional and sector-level initiatives.
* Track budgets, procurements, and engagements.
* Monitor execution progress through quarterly updates.
* Provide transparency through dashboards and reporting.
* Maintain auditability through approval and clarification history.
* Enable collaboration between divisions, sectors, PMO, procurement teams, and executive leadership.

---

## 4. Scope

### In Scope

* Annual cycle management
* Division management within cycles
* Activity planning and approvals
* Activity execution and quarterly updates
* Procurement planning
* Engagement planning
* Budget and financial spending management
* Approval workflows
* Clarification workflows
* Dashboard and reporting views
* Export capabilities
* Role-based access control
* Clarification history tracking

### Out of Scope

Details to be defined in Technical Requirements Document.

---

## 5. Annual Cycle Management

### Cycle Creation

The System Administrator shall create an AOP Cycle for a specific year.

#### Business Rules

* Only one cycle can exist per year.
* Divisions can be added or removed before publication.
* The System Administrator can publish the cycle.
* Published cycles initiate the planning process.
* Cycles can be revised after publication.
* Additional divisions may be added through cycle revision.
* A cycle can be marked as Completed when the annual process ends.

### Cycle Visibility

Users shall be able to view:

* Current cycle
* Previous cycles
* Top three cycles sorted by dga_scheduled_end_date
* Completed cycles shall remain visible in read-only mode

---

## 6. Activity Classification

### Activity Scope

Activities shall be categorized as:

* Strategic
* Operational

### Activity Type

Activities shall be categorized as:

* New Project
* Ongoing Project
* Contract Operations
* Internal Operations

---

## 7. Application Phases

The application operates using two phases:

### Planning Phase

Used for planning and approval of activities.

### Execution Phase

Used for activity progress updates and execution monitoring.

#### Business Rule

Phases operate at Activity Level.

An activity that enters Execution Phase does not prevent new activities from being created in Planning Phase.

---

## 8. User Roles

The system shall support the following roles:

* AOP - Division Member
* AOP - Division Director
* AOP - Strategy Team
* AOP - PMO
* AOP - Procurement Team
* AOP - Executive Director
* AOP - Director General
* System Administrator

---

## 9. Planning Phase Workflow

### Step 1 – Activity Creation

**Actor:** AOP - Division Member

The Division Member creates an AOP Activity and submits it for approval.

Upon activity creation, the user may manage:

* Dependencies
* Team Members
* Budgets
* Milestones
* Procurement Plans
* Engagement Plans

**Submitted To:** AOP - Division Director

### Step 2 – Division Director Review

**Actor:** AOP - Division Director

#### Actions Available

* Approve
* Raise Clarification

#### Approval Outcome

Activity assigned to AOP - Strategy Team.

#### Clarification Outcome

Activity assigned back to AOP - Division Member.

Clarification comments are mandatory.

### Step 3 – Strategy Team Review

**Actor:** AOP - Strategy Team

#### Permissions

* Edit activity at any time.
* Edit activity regardless of status.

#### Actions Available

* Approve
* Raise Clarification

#### Approval Outcome

* Activity becomes Strategy Team Approved.
* Activity remains with AOP - Strategy Team.
* Activity is not automatically assigned to AOP - Executive Director.

#### Send to Executive Director Outcome

* AOP - Strategy Team submits the approved activity to AOP - Executive Director.
* Activity is assigned to AOP - Executive Director for review and approval.

#### Clarification Outcome

* Activity assigned back to AOP - Division Member.
* Clarification comments are mandatory.

### Step 4 – Executive Director Review

**Actor:** AOP - Executive Director

#### Actions Available

* Approve
* Raise Clarification

#### Approval Outcome

Activity assigned to AOP - Director General.

#### Clarification Outcome

* Activity assigned back to AOP - Division Member.
* Clarification comments are mandatory.

### Step 5 – Director General Review

**Actor:** AOP - Director General

#### Actions Available

* Approve
* Raise Clarification

#### Approval Outcome

* Activity becomes Approved.
* Planning Phase ends.
* Execution Phase starts.
* Activity assigned to AOP - Division Member.

#### Clarification Outcome

* Activity assigned back to AOP - Division Member.
* Planning Phase remains active.
* Clarification comments are mandatory.

---

## 10. Execution Phase Workflow

Execution approvals occur for each quarterly update submitted by the Division Member.

### Step 1 – Quarterly Update Submission

**Actor:** AOP - Division Member

The Division Member updates execution-related information and submits the activity.

**Submitted To:** AOP - Division Director

### Step 2 – Division Director Review

**Actor:** AOP - Division Director

#### Actions Available

* Approve
* Raise Clarification

#### Approval Outcome

Activity assigned to AOP - Strategy Team.

#### Clarification Outcome

* Execution updates are cleared.
* Activity assigned back to AOP - Division Member.
* Clarification comments are mandatory.

### Step 3 – Strategy Team Review

**Actor:** AOP - Strategy Team

#### Permissions

* Edit activity at any time.
* Edit activity regardless of status.

#### Actions Available

* Approve
* Raise Clarification

#### Approve Outcome

* Execution update becomes Strategy Team Approved.
* Activity remains with AOP - Strategy Team.

#### Send to Executive Director Outcome

* AOP - Strategy Team submits the approved execution update to AOP - Executive Director.
* Activity is assigned to AOP - Executive Director for review.

#### Clarification Outcome

* Execution updates are cleared.
* Activity assigned back to AOP - Division Member.
* Clarification comments are mandatory.

### Step 4 – Executive Director Review

**Actor:** AOP - Executive Director

#### Actions Available

* Approve
* Raise Clarification

#### Approval Outcome

* Quarterly execution update approved.
* Activity assigned back to AOP - Division Member.

#### Clarification Outcome

* Execution updates are cleared.
* Activity assigned back to AOP - Division Member.
* Clarification comments are mandatory.

### Execution Business Rules

* Execution approvals repeat for every quarter.
* Director General does not participate in Execution approvals.
* Strategy Team may edit activities at any time during Execution.
* Clarification history shall be maintained.

---

## 11. Special Role Permissions

### AOP - PMO

#### Permissions

* View all activities.
* Approve activities.
* Raise clarification.

#### Editable Fields

* Activity Classification only.

All other fields shall remain read-only.

### AOP - Procurement Team

#### Permissions

* View all activities.
* Approve activities.
* Raise clarification.

#### Editable Areas

* Procurement Plans only.

All other sections of the activity shall remain read-only.

---

## 12. Dashboard Requirements

Each role shall have access to a dashboard.

Dashboards shall provide:

* Activity status overview
* Budget overview
* Procurement overview
* Engagement overview
* Pending approvals overview

Detailed dashboard requirements shall be defined within the Technical Requirements Document.

---

## 13. Clarification Management

The system shall support clarification workflows.

### Business Rules

* Clarification comments are mandatory.
* Clarification history shall be maintained.
* Clarification history shall be visible to authorized users.
* Activities shall return to the designated previous role based on workflow rules.

---

## 14. Screen Requirements

### AOP - Division Member

#### Screens

* Dashboard
* Create Activity
* Division Overview
* Activity Lead
* Activities List
* Procurement Plans
* Engagement Plans
* Financial Spending

### AOP - Division Director

#### Screens

* Dashboard
* Division Overview
* Activity Lead
* Activities List
* Approvals
* Procurement Plans
* Engagement Plans
* Financial Spending

### AOP - Strategy Team

#### Screens

* Dashboard
* Sector/Division Overview
* Activity Lead
* Activities List
* Approvals
* Procurement Plans
* Engagement Plans
* Financial Spending

### AOP - PMO

#### Screens

* Dashboard
* Sector/Division Overview
* Activity Lead
* Activities List
* Approvals
* Procurement Plans
* Engagement Plans
* Financial Spending

### AOP - Procurement Team

#### Screens

* Dashboard
* Sector/Division Overview
* Activity Lead
* Activities List
* Approvals
* Procurement Plans
* Engagement Plans
* Financial Spending

### AOP - Executive Director

#### Screens

* Dashboard
* Sector Overview
* Activity Lead
* Activities List
* Approvals
* Procurement Plans
* Engagement Plans
* Financial Spending

### AOP - Director General

#### Screens

* Dashboard
* Sector/Division Overview
* Activity Lead
* Activities List
* Approvals
* Procurement Plans
* Engagement Plans
* Financial Spending

---

## 15. Common Screen Features

Where applicable, screens shall support:

* Search
* Filtering
* Column-wise Filtering
* Pagination
* Lazy Loading
* Export Functionality

These features apply to:

* Activities List
* Approvals
* Procurement Plans
* Engagement Plans
* Financial Spending

---

## 16. Reporting and Export

The system shall provide export capabilities for:

* Activities
* Procurement Plans
* Engagement Plans
* Financial Spending Information

Export formats shall be defined in the Technical Requirements Document.

---

## 17. Audit and History

The system shall maintain:

* Activity approval history
* Activity clarification history
* Activity status history
* Quarterly execution update history
* Cycle revision history

---

## 18. Assumptions

* One active cycle exists per year.
* Approval workflows are role-driven.
* Execution operates at activity level.
* Quarterly updates follow the execution workflow.
* Completed cycles remain available for reference.

---

## 19. Success Criteria

The solution shall be considered successful when:

* Annual planning is fully digitized.
* Approval workflows are enforced.
* Quarterly execution updates are tracked.
* Procurement and engagement plans are managed centrally.
* Budget visibility is available at all required organizational levels.
* Historical records and clarification trails are maintained.