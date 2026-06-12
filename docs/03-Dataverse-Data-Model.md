# Dataverse Data Model

## 1. Purpose

This document defines the Dataverse data model required for the Annual Operating Plan application.

It describes the tables, key columns, relationships, choice fields, status fields, ownership model, and audit/history requirements used to support the AOP planning and execution lifecycle.

---

## 2. Core Tables Overview

| Table                         | Logical Name                      | Purpose                                                               |
| ----------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| User                          | systemuser                        | Stores all the users details                                          |
| Team                          | team                              | Stores all the teams details                                          |
| TeamMembership                | teammembership                    | Connect user and team                                                 |
| Security Role                 | role                              | Store all the security roles                                          |
| System User Roles             | systemuserroles                   | Connect user and role                                                 |
| Team Roles                    | teamroles                         | Connect team and role                                                 |
| Divisional Hierarchy          | dga_divisional_hierarchy          | Stores sectors/divisions hierarchy                                    |
| Objective                     | dga_objective                     | Stores all the objectives information                                 |
| Account                       | account                           | Stores all the adges/account information                              |
| Account Code                  | dga_account_code                  | Stores all the account codes information                              |
| Module Type                   | dga_module_type                   | Stores all the modules information                                    |
| Cycle                         | dga_assessment_cycle              | Stores annual cycle information                                       |
| Project Planning Instance     | dga_project_planning_instance     | Stores all the planning instance belongs to cycle                     |
| AOP Projects                  | dga_aop_projects                  | Stores main activity/project information                              |
| AOP Project Budgets           | dga_aop_project_budget            | Stores activity budget records                                        |
| AOP Project Budget Details    | dga_aop_project_budget_details    | Stores activity sub-budget records linked with dga_aop_project_budget |
| AOP Project Milestone Details | dga_aop_project_milestone_details | Stores activity milestone records                                     |
| Dependency                    | dga_dependency                    | Stores activity dependencies                                          |
| Procurement Plan              | dga_procurement_plan              | Stores procurement plans linked to activities                         |
| AOP Cost Center               | dga_aop_cost_center               | Stores all the cost center information                                |
| Category                      | dga_category                      | Stores all the categories information                                 |
| AOP Engagement Plan           | dga_aop_engagement_plan           | Stores engagement plans linked to activities                          |
| Engagement – Sub Type         | dga_engagement_sub_type           | Stores engagement plans type and sub type information                 |
| Project Clarification         | dga_projectclarification          | Stores clarification history                                          |
| AOP Project Logs              | dga_aop_project_logs              | Stores all the activity logs information                              |

---

## 3. Table Details

### 3.1 User

#### Purpose

Stores all user details.

#### Key Columns

| Column         | Logical Name         | Type              | Required | Description                                         |
| -------------- | -------------------- | ----------------- | -------- | --------------------------------------------------- |
| Full Name      | fullname             | Text              | Yes      | Full name of the user                               |
| Internal Email | internalemailaddress | Text              | No       | Primary internal email address of the user          |
| User ID        | systemuserid         | Unique Identifier | System   | Unique identifier for the system user (Primary Key) |

---

### 3.2 Team

#### Purpose

Stores all team details.

#### Key Columns

| Column      | Logical Name | Type              | Required | Description                                  |
| ----------- | ------------ | ----------------- | -------- | -------------------------------------------- |
| Team Name   | name         | Text              | Yes      | Name of the team                             |
| Description | description  | Text              | No       | Description of the team                      |
| Team ID     | teamid       | Unique Identifier | System   | Unique identifier for the team (Primary Key) |

---

### 3.3 TeamMembership

#### Purpose

Connect user and team

#### Key Columns

| Column             | Logical Name     | Type              | Required | Description                                                      |
| ------------------ | ---------------- | ----------------- | -------- | ---------------------------------------------------------------- |
| User ID            | systemuserid     | Lookup            | Yes      | Unique identifier of the system user who is a member of the team |
| Team ID            | teamid           | Lookup            | Yes      | Unique identifier of the team the user belongs to                |
| Team Membership ID | teammembershipid | Unique Identifier | System   | Unique identifier for the team membership record (Primary Key)   |

---

### 3.4 Role

#### Purpose

Store all the securtiy roles.

#### Key Columns

| Column    | Logical Name | Type              | Required | Description                                           |
| --------- | ------------ | ----------------- | -------- | ----------------------------------------------------- |
| Role Name | name         | Text              | Yes      | Name of the security role                             |
| Role ID   | roleid       | Unique Identifier | System   | Unique identifier for the security role (Primary Key) |

---

### 3.5 System User Roles

#### Purpose

Connect user and role

#### Key Columns

| Column       | Logical Name     | Type              | Required | Description                                                          |
| ------------ | ---------------- | ----------------- | -------- | -------------------------------------------------------------------- |
| Role ID      | roleid           | Lookup            | Yes      | Unique identifier of the security role assigned to the user          |
| User ID      | systemuserid     | Lookup            | Yes      | Unique identifier of the user who is assigned the security role      |
| User Role ID | systemuserroleid | Unique Identifier | System   | Unique identifier for the user role association record (Primary Key) |

---

### 3.6 Team Roles

#### Purpose

Connect team and role

#### Key Columns

| Column       | Logical Name | Type              | Required | Description                                                          |
| ------------ | ------------ | ----------------- | -------- | -------------------------------------------------------------------- |
| Role ID      | roleid       | Lookup            | Yes      | Unique identifier of the security role assigned to the team          |
| Team ID      | teamid       | Lookup            | Yes      | Unique identifier of the team assigned the security role             |
| Team Role ID | teamroleid   | Unique Identifier | System   | Unique identifier for the team role association record (Primary Key) |

---

### 3.7 Divisional Hierarchy

#### Purpose

Stores sectors/divisions hierarchy

#### Key Columns

| Column                      | Logical Name                    | Type              | Required | Description                                                                             |
| --------------------------- | ------------------------------- | ----------------- | -------- | --------------------------------------------------------------------------------------- |
| Arabic Name                 | dga_arabic_name                 | Text              | No       | The name of the divisional hierarchy in Arabic (dga_arabic_name)                        |
| Description                 | dga_description                 | Text              | No       | Description of the divisional hierarchy (dga_description)                               |
| Director                    | dga_director                    | Lookup            | Yes      | Lookup to the User/Contact record designated as the director (dga_director)             |
| Division Member Team ID     | dga_division_member_team_id     | Lookup            | Yes      | Lookup reference for the division's member team (dga_division_member_team_id)           |
| Divisional Hierarchy ID     | dga_divisional_hierarchyid      | Unique Identifier | System   | Unique identifier for this hierarchy record (Primary Key) (dga_divisional_hierarchyid)  |
| Name                        | dga_name                        | Text              | Yes      | Name of the divisional hierarchy (dga_name)                                             |
| Parent Divisional Hierarchy | dga_parent_divisional_hierarchy | Lookup            | Yes      | Self-referencing lookup to the parent hierarchy level (dga_parent_divisional_hierarchy) |
| Short Name                  | dga_short_name                  | Text              | No       | Abbreviation or short name for the division (dga_short_name)                            |
| Team                        | dga_team                        | Lookup            | Yes      | Lookup to the associated Team record (dga_team)                                         |
| Type                        | dga_type                        | Choice            | Yes      | Type classification of the hierarchy level (dga_type)                                   |
| Status Reason               | statuscode                      | Choice            | Yes      | The status reason of the record (statuscode)                                            |

#### Type Values

| Code      | Value    |
| --------- | -------- |
| 776140000 | Vertical |
| 776140001 | Sector   |
| 776140002 | Division |
| 776140003 | Entity   |

#### Status Reason Values

| Code      | Value    |
| --------- | -------- |
| 1         | Draft    |
| 2         | Inactive |
| 576610001 | Publish  |

---

### 3.8 Objective

#### Purpose

Stores all the objectives information

#### Key Columns

| Column         | Logical Name       | Type              | Required | Description                                               |
| -------------- | ------------------ | ----------------- | -------- | --------------------------------------------------------- |
| Objective Name | dga_name           | Text              | Yes      | The name of the objective                                 |
| Objective Type | dga_objective_type | Choice            | Yes      | Classification type of the objective                      |
| Objective ID   | dga_objectiveid    | Unique Identifier | System   | Unique identifier for this objective record (Primary Key) |
| Status Reason  | statuscode         | Choice            | Yes      | The status reason of the record                           |
| Description    | dga_description    | Text              | No       | Description or details of the objective                   |
| Owner          | ownerid            | Owner (Lookup)    | Yes      | The User or Team that owns the record                     |

#### Objective Type Values

| Code | Value                         |
| ---- | ----------------------------- |
| 1    | Strategic Priorities          |
| 2    | KPI                           |
| 3    | Digital Pillar                |
| 4    | Objective                     |
| 5    | DGE Corporate Strategy Pillar |

---

### 3.9 Account

#### Purpose

Stores all the adges/account information

#### Key Columns

| Column        | Logical Name    | Type              | Required | Description                                            |
| ------------- | --------------- | ----------------- | -------- | ------------------------------------------------------ |
| Account ID    | accountid       | Unique Identifier | System   | Unique identifier for the account record (Primary Key) |
| Arabic Name   | dga_arabic_name | Text              | No       | The name of the account in Arabic                      |
| Account Name  | name            | Text              | Yes      | The primary name of the account                        |
| Status Reason | statuscode      | Choice            | Yes      | The status reason of the record                        |

#### Status Reason Values

| Code      | Value    |
| --------- | -------- |
| 1         | Draft    |
| 2         | Inactive |
| 576610001 | Publish  |

---

### 3.10 Account Code

#### Purpose

Store all the account code information

#### Key Columns

| Column                   | Logical Name               | Type              | Required | Description                                                                                       |
| ------------------------ | -------------------------- | ----------------- | -------- | ------------------------------------------------------------------------------------------------- |
| Account Code ID          | dga_account_codeid         | Unique Identifier | System   | Unique identifier for this account code record (Primary Key)                                      |
| Description              | dga_description            | Text              | No       | Description or details explaining the purpose of the account code                                 |
| Divisional Hierarchy     | dga_divisional_hierarchy   | Lookup            | Yes      | Lookup reference to the associated divisional hierarchy level                                     |
| Account Code Name        | dga_name                   | Text              | Yes      | The financial name or label of the account code                                                   |
| Strategic vs Operational | dga_strategicvsoperational | Choice            | Yes      | Classification indicating whether the account code is designated for strategic or operational use |
| Status Reason            | statuscode                 | Choice            | Yes      | The status reason tracking the governance state of the record                                     |

---

### 3.11 Cycle

#### Purpose

Stores annual cycle information

#### Key Columns

| Column               | Logical Name             | Type              | Required | Description                                                      |
| -------------------- | ------------------------ | ----------------- | -------- | ---------------------------------------------------------------- |
| Assessment Cycle ID  | dga_assessment_cycleid   | Unique Identifier | System   | Unique identifier for this assessment cycle record (Primary Key) |
| Cycle Name           | dga_name                 | Text              | Yes      | Name of the assessment cycle                                     |
| Scheduled End Date   | dga_scheduled_end_date   | DateTime          | Yes      | The planned or scheduled end date for the cycle                  |
| Scheduled Start Date | dga_scheduled_start_date | DateTime          | Yes      | The planned or scheduled start date for the cycle                |
| Scope                | dga_scope                | Choice            | No       | Indicates whether the cycle is within scope                      |
| Status Reason        | statuscode               | Choice            | Yes      | The status reason of the record                                  |

#### Scope Values

| Code | Value |
| ---- | ----- |
| 1    | Yes   |
| 0    | No    |

#### Status Reason Values

| Code      | Value     |
| --------- | --------- |
| 1         | Publish   |
| 2         | Inactive  |
| 776140001 | Draft     |
| 776140002 | Completed |

---

### 3.12 Project Planning Instance

#### Purpose

Stores all project planning instance belongs to cycle

#### Key Columns

| Column                 | Logical Name               | Type            | Required | Description                                                                    |
| ---------------------- | -------------------------- | --------------- | -------- | ------------------------------------------------------------------------------ |
| Actual End Date        | dga_actual_end_date        | DateTime        | No       | The actual date when the planning instance was concluded                       |
| Actual Start Date      | dga_actual_start_date      | DateTime        | No       | The actual date when the planning instance officially commenced                |
| Are All Projects Added | dga_are_all_projects_added | Choice (Yes/No) | No       | A toggle flag indicating if departments have finalized adding their projects   |
| Assessment Cycle       | dga_assessment_cycle       | Lookup          | No       | Lookup reference linking this instance to a master Assessment Cycle            |
| Divisional Hierarchy   | dga_divisional_hierarchy   | Lookup          | No       | Lookup reference to the associated division, department, or sector             |
| Planning Instance Name | dga_name                   | Text            | Yes      | The primary name or title identifying this project planning instance           |
| Planned End Date       | dga_planned_end_date       | DateTime        | No       | The target deadline date scheduled for completing this planning phase          |
| Planned Start Date     | dga_planned_start_date     | DateTime        | No       | The baseline scheduled launch date for this planning instance                  |
| Strategy Email Sent    | dga_strategy_email_sent    | Choice (Yes/No) | No       | Tracks whether the automated launch or notification email has been broadcasted |
| Status Reason          | statuscode                 | Choice          | Yes      | The workflow or record state status of the planning instance                   |

#### Status Reason Values

| Code      | Value       |
| --------- | ----------- |
| 1         | Active      |
| 2         | Inactive    |
| 776140001 | Draft       |
| 776140002 | In Progress |

## 3.13 AOP Projects

### Purpose

Stores main activity/project information

### Key Columns

Here are the structured tables for the dga_aop_projects entity, including the Logical Name column and separate value tables for each choice/dropdown field:

#### Key Columns

| Column                            | Logical Name                                | Type              | Required | Description                                                                   |
| --------------------------------- | ------------------------------------------- | ----------------- | -------- | ----------------------------------------------------------------------------- |
| AOP Project ID                    | dga_aop_projectsid                          | Unique Identifier | System   | Unique identifier for this project record (Primary Key)                       |
| Activity Classification           | dga_activity_classification                 | Choice            | Yes      | Classification type mapping (e.g., EPM Registered, Operational)               |
| Activity Lead                     | dga_activity_lead                           | Lookup            | Yes      | Reference to the user leading this project activity                           |
| Activity Type                     | dga_activity_type                           | Choice            | Yes      | Classification indicating if the project is new, ongoing, or operational      |
| ADEO Review Required              | dga_adeo_review_required                    | Choice (Yes/No)   | Yes      | Indicates whether an ADEO review is mandatory                                 |
| Department                        | dga_department                              | Lookup            | Yes      | Reference to the department owning the project                                |
| Description Summary               | dga_description_summary                     | Text              | No       | Short high-level summary of the project description                           |
| DGE Corporate Strategy Pillar     | dga_dge_corporate_strategy_pillar           | Lookup            | Yes      | Linked corporate strategy pillar reference                                    |
| Requires Procurement              | dga_does_this_project_require_procurement   | Choice (Yes/No)   | Yes      | Indicates whether procurement processes are needed                            |
| Requires Budget Allocation        | dga_doesthisprojectrequirebudgetallocation  | Choice (Yes/No)   | Yes      | Flag indicating if this project requires financial budget allocation          |
| Gov Digital Pillar                | dga_govdigital_pillar                       | Lookup            | Yes      | Associated government digital pillar reference                                |
| Link to DGE Strategic Objective   | dga_link_to_dge_strategic_objective         | Lookup            | Yes      | Lookup reference to the DGE Strategic Objective entity                        |
| Link to Strategic KPIs            | dga_link_to_strategic_kpis                  | Lookup            | Yes      | Lookup reference to the Strategic KPIs entity                                 |
| Long Term Impact Summary          | dga_longtermimpactprojectlongtermimpact     | Text              | Yes      | Summary notes regarding long term impacts                                     |
| Project Reference Name            | dga_name                                    | Text              | Yes      | System tracking name or identifier                                            |
| Planned End Date                  | dga_planned_end_date                        | DateTime          | Yes      | Target completion date of the project                                         |
| Planned Start Date                | dga_planned_start_date                      | DateTime          | Yes      | Target launch date of the project                                             |
| Project Categorized Under         | dga_project_categorized_under               | Choice            | No       | Strategy classification under which the project falls                         |
| Project Description               | dga_project_description                     | Text              | No       | Detailed explanation of the project's scope and objectives                    |
| Project KPI                       | dga_project_kpi                             | Lookup            | Yes      | KPIs specific to evaluating this project's performance                        |
| Project Name                      | dga_project_name                            | Text              | Yes      | The primary public-facing name of the project                                 |
| Overall Long Term Impact          | dga_project_overall_long_term_impact        | Text              | Yes      | Deep-dive details on overall macro long-term impact                           |
| Project Plan Details              | dga_project_plan_if_any                     | Text              | No       | Details regarding the milestone plan or uploaded timeline structure           |
| Project Type                      | dga_project_type                            | Choice            | Yes      | Specific architectural or functional classification type                      |
| Risks                             | dga_risks                                   | Text              | No       | Identified risks and roadblocks associated with the project                   |
| Scope                             | dga_scope                                   | Text              | No       | In-scope and out-of-scope boundaries defined for the project                  |
| Sector                            | dga_sector                                  | Lookup            | Yes      | Reference to the business/governance sector owning the project                |
| Stakeholders                      | dga_stakeholders                            | Text              | No       | Listed target entities, internal teams, or external groups involved           |
| Allocated Budget                  | dga_allocated_budget                        | Currency          | No       | Total approved budget amount allocated for the project                        |
| Budget Source                     | dga_budget_source                           | Choice            | No       | Reference source supplying the funds                                          |
| Budget Type                       | dga_budget_type                             | Choice            | No       | Category structure of the requested budget                                    |
| Requested Budget                  | dga_requested_budget                        | Currency          | No       | Baseline initial budget requested by the project team                         |
| Total Project Budget              | dga_total_project_budget                    | Currency          | No       | Aggregate project financial budget cap valuation                              |
| Strategic vs Operation            | dga_strategic_vs_operation                  | Choice            | No       | Distinguishes whether the project is strategic or operational                 |
| Budget Review Comments            | dga_budget_review_comments                  | Text              | No       | Direct auditor notes or remarks from the finance evaluation                   |
| Budget Reviewed                   | dga_budget_reviewed                         | Choice (Yes/No)   | No       | Flags whether financial tracking review is complete                           |
| Cancel Reason                     | dga_cancel_reason                           | Text              | No       | Justification text explaining project cancellation                            |
| Dependencies                      | dga_dependencies                            | Lookup            | No       | Tracked technical, operational, or vendor dependencies                        |
| Is Project Start                  | dga_is_project_start                        | Choice (Yes/No)   | No       | Status indicator if project active operations have commenced                  |
| Is Rejected                       | dga_is_rejected                             | Choice (Yes/No)   | No       | Toggle showing whether the project has been formally rejected                 |
| Justification for Activity Status | dga_justification_for_activity_status       | Text              | No       | Context explaining why an activity is delayed, on track, or on hold           |
| Justification for Budget          | dga_justification_for_budget                | Text              | No       | Business case justification backing the budget request amount                 |
| Multi-Year Project                | dga_multi_year_project                      | Choice (Yes/No)   | No       | Flag indicating if project timeline expands across multiple years             |
| New Outcome                       | dga_new_outcome                             | Text              | No       | Updated or target outcomes adjusted during lifecycle reviews                  |
| OPEX / CAPEX                      | dga_opex_capex                              | Choice            | No       | Classifies financial funding as Operational or Capital Expenditure            |
| Outcome                           | dga_outcome                                 | Text              | No       | Original planned baseline project outcome statement                           |
| Project Activity Status           | dga_project_activity_status                 | Choice            | No       | Current operational tracking phase status (e.g., On Track, Delayed)           |
| Project Long Term Impact          | dga_project_long_term_impact                | Text              | No       | Target strategic micro impacts defined for downstream operations              |
| Project Phase                     | dga_project_phase                           | Choice            | No       | Macro stage lifecycle marker (Planning vs Execution)                          |
| Project Planning Instance         | dga_project_planning_instance               | Lookup            | No       | Tracked planning batch configuration identifier                               |
| Registered in EPM                 | dga_registered_or_will_be_registered_in_epm | Choice (Yes/No)   | No       | Indicates whether this record is tracked within Enterprise Project Management |
| Rejection Reason                  | dga_rejection_reason                        | Text              | No       | Explicit reasoning given by reviewers for project rejection                   |
| Request Type                      | dga_request_type                            | Choice            | No       | Defines what type of project request this record represents                   |
| Request Value                     | dga_request_value                           | Text              | No       | Evaluation tier metadata value linked to project requests                     |
| Owner                             | ownerid                                     | Owner (Lookup)    | Yes      | The User or Team that owns this project record                                |
| Status Reason                     | statuscode                                  | Choice            | Yes      | Approval cycle governance status of the record                                |

#### Project Categorized Under Values

| Code      | Value                                 |
| --------- | ------------------------------------- |
| 576610000 | Government of the Future Strategy     |
| 576610001 | DGE Corporate Strategy                |
| 576610002 | Abu Dhabi Government Digital Strategy |

#### Activity Type Values

| Code | Value               |
| ---- | ------------------- |
| 1    | New Project         |
| 2    | Ongoing Project     |
| 3    | Contract Operations |
| 4    | Internal Operations |

#### Strategic vs Operation Values

| Code | Value      |
| ---- | ---------- |
| 1    | Strategic  |
| 2    | Operations |

#### Project Activity Status Values

| Code      | Value                  |
| --------- | ---------------------- |
| 776140014 | Draft                  |
| 776140007 | Not Started            |
| 776140005 | In Progress (Delayed)  |
| 776140006 | In Progress (On Track) |
| 776140009 | On Hold                |
| 776140010 | Cancelled              |
| 776140013 | Completed              |
| 776140015 | Submitted for Approval |

#### Project Phase Values

| Code      | Value     |
| --------- | --------- |
| 776140000 | Planning  |
| 776140001 | Execution |

#### Activity Classification Values

| Code      | Value                |
| --------- | -------------------- |
| 576610000 | EPM Registered       |
| 576610001 | Operational Activity |
| 576610002 | Payment Only         |

#### Status Reason Values

| Code      | Value                          |
| --------- | ------------------------------ |
| 1         | Draft                          |
| 2         | Inactive                       |
| 776140001 | Submitted to Division Director |
| 776140002 | Approved By Executive Director |
| 776140003 | Approved By Division Director  |
| 776140004 | Approved By Strategy Team      |
| 776140011 | Active                         |
| 776140012 | Clarification Needed           |
| 776140014 | Approved By Director General   |

---

## 3.14 AOP Project Budgets

### Purpose

Stores activity budget records

### Key Columns

| Column                | Logical Name             | Type              | Required | Description                                                                    |
| --------------------- | ------------------------ | ----------------- | -------- | ------------------------------------------------------------------------------ |
| Created By            | createdby                | Lookup            | System   | Unique identifier of the user who created the record                           |
| Created On            | createdon                | DateTime          | System   | Date and time when the record was created                                      |
| Actual Budget         | dga_actual_budget        | Currency          | No       | The actual financial budget amount consumed or utilized                        |
| AOP Project           | dga_aop_project          | Lookup            | No       | Lookup reference to the linked Annual Operating Plan (AOP) Project             |
| AOP Project Budget ID | dga_aop_project_budgetid | Unique Identifier | System   | Unique identifier for this project budget record (Primary Key)                 |
| Delivered Amount      | dga_delivered_amount     | Currency          | No       | The portion of the budget that has been officially delivered or paid out       |
| Is Zero               | dga_is_zero              | Choice (Yes/No)   | No       | Indicator flag evaluating whether the budget balance or allocation equals zero |
| Budget Name           | dga_name                 | Text              | Yes      | The name or title identifying the project budget record                        |
| Planned Budget        | dga_planned_budget       | Currency          | No       | The initial estimated or baseline planned budget allocation                    |
| Status Reason         | statuscode               | Choice            | Yes      | The status reason tracking the governance state of the record                  |

---

## 3.15 AOP Project Budget Details

### Purpose

Stores activity budget records

### Key Columns

| Column                        | Logical Name                     | Type              | Required | Description                                                                    |
| ----------------------------- | -------------------------------- | ----------------- | -------- | ------------------------------------------------------------------------------ |
| Account Code                  | dga_account_code                 | Lookup            | No       | Reference identifier for the specific financial account code                   |
| Amount                        | dga_amount                       | Currency          | No       | The specific financial line-item amount allocated or spent                     |
| AOP Project Budget            | dga_aop_project_budget           | Lookup            | No       | Lookup reference linking these details to the parent AOP Project Budget record |
| AOP Project Budget Details ID | dga_aop_project_budget_detailsid | Unique Identifier | System   | Unique identifier for this budget details record (Primary Key)                 |
| GRN                           | dga_grn                          | Text              | No       | Tracking identifier for Goods Received Note (GRN) documentation                |

---

## 3.16 AOP Project Milestone Details

### Purpose

Stores activity milestone records

### Key Columns

| Column                           | Logical Name                        | Type              | Required | Description                                                                             |
| -------------------------------- | ----------------------------------- | ----------------- | -------- | --------------------------------------------------------------------------------------- |
| Actual End Date                  | dga_actual_end_date                 | DateTime          | No       | The real or final date when the milestone was actually finished                         |
| Actual Progress (%)              | dga_actual_progress                 | Decimal / Integer | No       | The current verified operational completion progress percentage                         |
| Actual Start Date                | dga_actual_start_date               | DateTime          | No       | The real date when work on the milestone actually began                                 |
| AOP Project                      | dga_aop_project                     | Lookup            | No       | Lookup reference linking this milestone line-item to its parent AOP Project             |
| AOP Project Milestone Details ID | dga_aop_project_milestone_detailsid | Unique Identifier | System   | Unique identifier for this milestone detail record (Primary Key)                        |
| Cancellation Reason              | dga_cancellation_reason             | Text              | No       | Explanatory text providing reasons if the milestone is aborted or cancelled             |
| Description                      | dga_description                     | Text              | No       | Additional tracking notes, details, or metadata for the milestone                       |
| Justification                    | dga_justification                   | Text              | No       | Business justification or context regarding timeline changes, delays, or updates        |
| Milestone Description            | dga_milestone_description           | Text              | No       | Specific core scope description detailing what this milestone delivers                  |
| Milestone Name                   | dga_name                            | Text              | Yes      | The primary name, title, or label of the project milestone                              |
| Planned End Date                 | dga_planned_end_date                | DateTime          | No       | The baseline targeted completion deadline date for this milestone                       |
| Planned Progress (%)             | dga_planned_progress                | Decimal / Integer | No       | The expected benchmark progress percentage mapped for the current timeline              |
| Planned Start Date               | dga_planned_start_date              | DateTime          | No       | The baseline expected commencement date scheduled for this milestone                    |
| Current Progress Status          | dga_progress                        | Text              | No       | Meta status tracking marker reflecting current execution state indicators               |
| Baseline Start Date              | dga_start_date                      | DateTime          | No       | General placeholder or reference start date for the milestone timeline                  |
| Weightage (%)                    | dga_weightage                       | Decimal / Integer | No       | Relative impact weight assigned to this milestone relative to the overall project scope |
| Status Reason                    | statuscode                          | Choice            | Yes      | The workflow or approval governance status of the record                                |

#### Status Reason Values

| Code      | Value       |
| --------- | ----------- |
| 776140004 | Draft       |
| 1         | Not Started |
| 2         | Inactive    |
| 776140001 | In Progress |
| 776140002 | Delay       |
| 776140003 | Complete    |
| 576610001 | Cancelled   |

---

## 3.17 Dependency

### Purpose

Stores activity dependencies

### Key Columns

| Column                  | Logical Name                | Type              | Required | Description                                                            |
| ----------------------- | --------------------------- | ----------------- | -------- | ---------------------------------------------------------------------- |
| Created By              | createdby                   | Lookup            | System   | Unique identifier of the user who created the record                   |
| Created On              | createdon                   | DateTime          | System   | Date and time when the record was created                              |
| AOP Project             | dga_aop_project             | Lookup            | No       | Lookup reference to the associated Annual Operating Plan (AOP) Project |
| Date of Support         | dga_date_of_support         | DateTime          | No       | The specific date when the support is required or expected             |
| Dependency ID           | dga_dependencyid            | Unique Identifier | System   | Unique identifier for this dependency record (Primary Key)             |
| Dependency Name         | dga_name                    | Text              | Yes      | Name or brief title of the dependency                                  |
| Name of External Entity | dga_name_of_external_entity | Text              | No       | The name of the external group, vendor, or organization involved       |
| Owner                   | ownerid                     | Owner (Lookup)    | Yes      | The User or Team that owns the record                                  |
| Status Reason           | statuscode                  | Choice            | Yes      | The status reason of the record                                        |
| Type of Support         | dga_type_of_support         | Text / Choice     | No       | Describes the kind of support or assistance needed                     |

## 3.18 Procurement Plan

### Purpose

Stores procurement plans linked to activities

### Key Columns

| Column                            | Logical Name                               | Type              | Required | Description                                                                        |
| --------------------------------- | ------------------------------------------ | ----------------- | -------- | ---------------------------------------------------------------------------------- |
| Created By                        | createdby                                  | Lookup            | System   | Unique identifier of the user who created the record                               |
| Created On                        | createdon                                  | DateTime          | System   | Date and time when the record was created                                          |
| Actual Contract Duration (Months) | dga_actual_contract_duration_in_months     | Integer           | No       | The final real duration of the signed contract in months                           |
| Actual Contract Value             | dga_actual_contract_value                  | Currency          | No       | The definitive monetary value awarded in the final contract                        |
| Aligned with Strategic Plan       | dga_aligned_with_strategic_plan            | Choice (Yes/No)   | No       | Indicates if this procurement maps to the master strategic plan                    |
| AOP Cost Centre                   | dga_aop_cost_centre                        | Lookup            | No       | Lookup link to the responsible Annual Operating Plan Cost Center                   |
| AOP Project                       | dga_aop_project                            | Lookup            | No       | Lookup link to the associated parent AOP Project record                            |
| Category Code                     | dga_category_code                          | Lookup            | No       | System code or standard identifier classification for the items                    |
| Category Description              | dga_category_description                   | Text              | No       | Descriptive summary of the structural procurement category                         |
| Confirmed                         | dga_confirmed                              | Choice (Yes/No)   | No       | Internal flag noting if the line item allocation is confirmed                      |
| Current Procurement Status        | dga_current_procurement_status             | Choice            | No       | High-level tracking milestone of the procurement pipeline                          |
| Requires Tender                   | dga_does_this_project_require_tender       | Choice (Yes/No)   | No       | Flags whether this procurement activity must go through a formal tendering process |
| End User Comments                 | dga_end_user_comments                      | Text              | No       | Direct operational notes, requests, or context left by the business team           |
| Expected Awarding (Quarter)       | dga_expected_awarding_by_quarter           | Text              | No       | Targeted fiscal calendar quarter for the contract award phase                      |
| Expected Awarding Date (Month)    | dga_expected_awarding_date_by_month        | DateTime          | No       | Targeted month calendar reference for contract execution/awarding                  |
| Expected Contract Duration        | dga_expected_contract_duration             | Text              | No       | The planned or estimated lifespan of the contract agreement                        |
| Item/Service Description          | dga_item_service_description               | Text              | No       | Detailed description outlining the exact goods, works, or services to buy          |
| Justification Date                | dga_justification_date                     | DateTime          | No       | System date capturing when structural changes were justified                       |
| Justification of the Change       | dga_justification_of_the_change            | Text              | No       | Documentation stating the reason for timeline or valuation changes                 |
| Procurement Plan Name             | dga_name                                   | Text              | Yes      | The primary identifying title or label of the procurement plan line item           |
| New Outcome Type                  | dga_new_outcome                            | Choice            | No       | Classification tracking if the outcome is a PO or Contract Agreement               |
| OPEX / CAPEX                      | dga_opex_capex                             | Choice            | No       | Classifies funding source as Operational or Capital Expenditure                    |
| PR Expected Value 2024            | dga_pr_expected_value_2024                 | Currency          | No       | Baseline historical benchmark value allocated for the Purchase Request             |
| PR Ticket Number                  | dga_pr_ticket_number                       | Text              | No       | Tracking ID from ERP or e-Procurement platforms for the Purchase Request           |
| Procurement Plan ID               | dga_procurement_planid                     | Unique Identifier | System   | Unique identifier for this procurement plan record (Primary Key)                   |
| Procurement Review Comment        | dga_procurement_review_comment             | Text              | No       | Direct evaluation remarks provided by the procurement steering team                |
| Procurement Reviewed              | dga_procurement_reviewed                   | Choice (Yes/No)   | No       | Flag confirming if the procurement board has audited the entry                     |
| Progress Update                   | dga_progress_update                        | Text              | No       | Free text field capturing recent milestones, notes, or execution blockers          |
| PR Raising (Quarter)              | dga_purchase_request_raising_by_quarter    | Text              | No       | Targeted calendar quarter for submitting the formal PR ticket                      |
| PR Raising Date (Month)           | dga_purchase_request_raising_date_by_month | DateTime          | No       | Targeted month milestone for submitting the formal PR ticket                       |
| Request Type                      | dga_request_type                           | Choice            | No       | Nature of the contract request (e.g., New, Renewal, Amendment)                     |
| Solicitation Channel              | dga_solicitation_channel                   | Choice            | No       | Process channel selected for go-to-market (e.g., RFP, RFQ)                         |
| Sourcing Method                   | dga_sourcing_method                        | Choice            | No       | Mechanism utilized to pick vendors (e.g., Public Tender, Sole Source)              |
| Stage Update Date                 | dga_stage_update_date                      | DateTime          | No       | Timestamp indicating exactly when the pipeline phase was last edited               |
| Tender Type                       | dga_tender_type                            | Choice            | No       | Status notation regarding if the tender workflow has been initiated                |
| Total Estimated Value             | dga_total_project_budget                   | Currency          | No       | The total budgetary valuation projected for this entire transaction                |
| Owner                             | ownerid                                    | Owner (Lookup)    | Yes      | The User or Team that owns this record                                             |
| Status Reason                     | statuscode                                 | Choice            | Yes      | The workflow or record state status of the entry                                   |

### Current Procurement Status Values

| Code | Value                 |
| ---- | --------------------- |
| 1    | Floated               |
| 2    | Awarded               |
| 3    | Commercial Evaluation |
| 4    | Technical Evaluation  |
| 5    | Postponed             |
| 6    | Pending Approval      |
| 7    | Contracting           |
| 8    | Execution Started     |
| 9    | Not Started           |
| 10   | On Hold               |
| 11   | Drafted               |
| 12   | Cancelled             |
| 13   | Delayed               |
| 14   | On Track              |
| 15   | Completed             |
| 16   | Under Renewal         |
| 17   | Not Floated           |

### New Outcome Values

| Code | Value              |
| ---- | ------------------ |
| 1    | Purchase Order     |
| 2    | Contract Agreement |

### Tender Type Values

| Code | Value      |
| ---- | ---------- |
| 1    | Raised     |
| 2    | Not raised |

### OPEX / CAPEX Values

| Code | Value |
| ---- | ----- |
| 1    | Opex  |
| 2    | Capex |

### Request Type Values

| Code | Value             |
| ---- | ----------------- |
| 1    | New               |
| 2    | Renewal           |
| 3    | Amendment         |
| 4    | Existing Contract |
| 5    | GWPL              |
| 6    | NA                |

### Solicitation Channel Values

| Code | Value |
| ---- | ----- |
| 1    | RFQ   |
| 2    | RFP   |
| 3    | RFI   |
| 4    | NA    |
| 5    | GWPL  |

### Sourcing Method Values

| Code | Value                |
| ---- | -------------------- |
| 1    | Public Tender        |
| 2    | Limited Tender       |
| 3    | Sole Source Tender   |
| 4    | Single Source Tender |
| 5    | NA                   |
| 6    | GWPL                 |

---

## 3.19 AOP Cost Center

### Purpose

Stores all the cost center information

### Key Columns

| Column                  | Logical Name               | Type              | Required | Description                                                                   |
| ----------------------- | -------------------------- | ----------------- | -------- | ----------------------------------------------------------------------------- |
| Created By              | createdby                  | Lookup            | System   | Unique identifier of the user who created the record                          |
| Created On              | createdon                  | DateTime          | System   | Date and time when the record was created                                     |
| AOP Cost Center ID      | dga_aop_cost_centerid      | Unique Identifier | System   | Unique identifier for this AOP cost center record (Primary Key)               |
| Cost Center             | dga_cost_center            | Lookup            | No       | Reference or identifier for the specific financial cost center                |
| Divisional Hierarchy    | dga_divisional_hierarchy   | Lookup            | No       | Lookup reference to the associated divisional hierarchy level                 |
| Name                    | dga_name                   | Text              | Yes      | Name of the AOP cost center mapping                                           |
| Strategic vs Operations | dga_strategic_vs_operation | Choice            | No       | Classification indicating whether the cost center is strategic or operational |
| Status Reason           | statuscode                 | Choice            | Yes      | The status reason of the record                                               |

### Strategic vs Operations Values

| Code | Value      |
| ---- | ---------- |
| 1    | Strategic  |
| 2    | Operations |

### Status Reason Values

| Code | Value    |
| ---- | -------- |
| 1    | Active   |
| 2    | Inactive |

---

## 3.20 Category

### Purpose

Stores all the categories information

### Key Columns

| Column        | Logical Name    | Type              | Required | Description                                              |
| ------------- | --------------- | ----------------- | -------- | -------------------------------------------------------- |
| Created By    | createdby       | Lookup            | System   | Unique identifier of the user who created the record     |
| Created On    | createdon       | DateTime          | System   | Date and time when the record was created                |
| Category ID   | dga_categoryid  | Unique Identifier | System   | Unique identifier for this category record (Primary Key) |
| Description   | dga_description | Text              | No       | Description or details of the category                   |
| Category Name | dga_name        | Text              | Yes      | The name of the category                                 |
| Status Reason | statuscode      | Choice            | Yes      | The status reason of the record                          |

### Status Reason Values

| Code | Value    |
| ---- | -------- |
| 1    | Active   |
| 2    | Inactive |

## 3.21 AOP Engagement Plan

### Purpose

Stores engagement plans linked to activities

### Key Columns

| Column                         | Logical Name                             | Type              | Required | Description                                                                   |
| ------------------------------ | ---------------------------------------- | ----------------- | -------- | ----------------------------------------------------------------------------- |
| Created By                     | createdby                                | Lookup            | System   | Unique identifier of the user who created the record                          |
| Created On                     | createdon                                | DateTime          | System   | Date and time when the record was created                                     |
| AD Companies                   | dga_ad_companies                         | Choice            | No       | Reference to Abu Dhabi companies associated with the plan                     |
| AD Companies Justification     | dga_ad_companies_justification           | Text              | No       | Business justification text for involving the selected AD companies           |
| ADGEs Involved                 | dga_adges_involved                       | Choice (Yes/No)   | No       | Indicates whether Abu Dhabi Government Entities are involved                  |
| AOP Engagement Plan ID         | dga_aop_engagement_planid                | Unique Identifier | System   | Unique identifier for this engagement plan record (Primary Key)               |
| AOP Project                    | dga_aop_project                          | Lookup            | No       | Lookup reference to the linked Annual Operating Plan (AOP) Project            |
| Divisions                      | dga_divisions                            | Text              | No       | Associated divisions involved in the engagement plan                          |
| End Date                       | dga_end_date                             | DateTime          | No       | The final or concluding date of the engagement activity                       |
| Engagement Type                | dga_engagement_type                      | Lookup            | No       | The high-level category type of the engagement                                |
| Federal Entities               | dga_federal_entities                     | Choice            | No       | Reference to federal government entities involved                             |
| Federal Entities Justification | dga_federal_entities_justification       | Text              | No       | Justification notes explaining the necessity of federal involvement           |
| Include AOP Project            | dga_include_aop_project                  | Choice (Yes/No)   | No       | Flag indicating whether to actively bundle or include the project link        |
| Engagement Plan Name           | dga_name                                 | Text              | Yes      | The name or title of the engagement plan                                      |
| Notes by GR Team               | dga_notes_by_gr_team                     | Text              | No       | Review remarks, feedback, or notes left by the Government Relations team      |
| Notes for GR Team              | dga_notes_for_gr_team                    | Text              | No       | Instructions, context, or requests submitted to the Government Relations team |
| Required GR Support            | dga_required_gr_support                  | Choice            | No       | Specifies the nature or scope of support required from Government Relations   |
| Creator's Sector/Division      | dga_sector_or_division_of_createdby_user | Text              | No       | Automatically captured sector or division details of the record creator       |
| Sectors                        | dga_sectors                              | Text              | No       | Target business or governance sectors involved in the plan                    |
| Selected ADGEs                 | dga_selected_adges                       | Text              | No       | Particular list of chosen Abu Dhabi Government Entities                       |
| Start Date                     | dga_start_date                           | DateTime          | No       | The commencement or initial date of the engagement activity                   |
| Sub Type                       | dga_sub_type                             | Lookup            | No       | Granular classification sub-tier linked to the parent engagement type         |
| Owner                          | ownerid                                  | Owner (Lookup)    | Yes      | The User or Team that owns the record                                         |
| Status Reason                  | statuscode                               | Choice            | Yes      | The status reason of the record                                               |

### Status Reason Values

| Code      | Value    |
| --------- | -------- |
| 1         | Publish  |
| 2         | Inactive |
| 576610001 | Draft    |

---

## 3.22 Engagement – Sub Type

### Purpose

Stores engagement plans type and sub type information

### Key Columns

| Column                   | Logical Name              | Type              | Required | Description                                                         |
| ------------------------ | ------------------------- | ----------------- | -------- | ------------------------------------------------------------------- |
| Created By               | createdby                 | Lookup            | System   | Unique identifier of the user who created the record                |
| Created On               | createdon                 | DateTime          | System   | Date and time when the record was created                           |
| Category                 | dga_category              | Choice            | Yes      | Classification tier indicating if it is a Type or Sub-Type          |
| Engagement Sub-Type ID   | dga_engagement_sub_typeid | Unique Identifier | System   | Unique identifier for this engagement sub-type record (Primary Key) |
| Engagement Sub-Type Name | dga_name                  | Text              | Yes      | The name of the engagement sub-type                                 |
| Parent Type              | dga_parent_type           | Lookup            | No       | Lookup reference to the parent engagement type hierarchy            |
| Status Reason            | statuscode                | Choice            | Yes      | The status reason of the record                                     |

### Category Values

| Code | Value      |
| ---- | ---------- |
| 1    | Type       |
| 2    | Sub - Type |

### Status Reason Values

| Code | Value    |
| ---- | -------- |
| 1    | Active   |
| 2    | Inactive |

---

## 3.23 Project Clarification

### Purpose

Stores clarification history

### Key Columns

| Column                   | Logical Name               | Type              | Required | Description                                                                                  |
| ------------------------ | -------------------------- | ----------------- | -------- | -------------------------------------------------------------------------------------------- |
| Created By               | createdby                  | Lookup            | System   | Unique identifier of the user who created the record                                         |
| Created On               | createdon                  | DateTime          | System   | Date and time when the record was created                                                    |
| AOP Project              | dga_aop_project            | Lookup            | No       | Lookup reference to the associated Annual Operating Plan (AOP) Project needing clarification |
| Description              | dga_description            | Text              | No       | Detailed explanation or description of the clarification request or response                 |
| Clarification Name       | dga_name                   | Text              | Yes      | The title or short name identifying the project clarification                                |
| Project Clarification ID | dga_projectclarificationid | Unique Identifier | System   | Unique identifier for this project clarification record (Primary Key)                        |
| Owner                    | ownerid                    | Owner (Lookup)    | Yes      | The User or Team that owns the record                                                        |
| Status Reason            | statuscode                 | Choice            | Yes      | The status reason of the record                                                              |

### Status Reason Values

| Code | Value    |
| ---- | -------- |
| 1    | Active   |
| 2    | Inactive |

---

## 3.24 AOP Project Logs

### Purpose

Stores all the activity logs information

### Key Columns

| Column             | Logical Name           | Type              | Required | Description                                                   |
| ------------------ | ---------------------- | ----------------- | -------- | ------------------------------------------------------------- |
| Created By         | createdby              | Lookup            | System   | Unique identifier of the user who created the record          |
| Created On         | createdon              | DateTime          | System   | Date and time when the log entry was created                  |
| AOP Project Log ID | dga_aop_project_logsid | Unique Identifier | System   | Unique identifier for this project log record (Primary Key)   |
| AOP Project        | dga_aop_project        | Lookup            | Yes      | Identifier of AOP Activity                                    |
| Log Name           | dga_name               | Text              | Yes      | Title or short identifier for the audit log entry             |
| New Value          | dga_new_value          | Text              | No       | The updated value of the field after the change               |
| Previous Value     | dga_previous_value     | Text              | No       | The original value of the field before the change             |
| Log Type           | dga_type               | Choice            | No       | Categorizes the section or entity attribute being audited     |
| Modified By        | modifiedby             | Lookup            | System   | Unique identifier of the user who last modified the log entry |
| Modified On        | modifiedon             | DateTime          | System   | Date and time when the log entry was last modified            |
| Owner              | ownerid                | Owner (Lookup)    | Yes      | The User or Team that owns the record                         |
| Status Reason      | statuscode             | Choice            | Yes      | The operational status of the log record                      |

### Log Type Values

| Code      | Value                              |
| --------- | ---------------------------------- |
| 776140000 | Milestone                          |
| 776140001 | Budget                             |
| 776140002 | Project                            |
| 776140003 | Procurement Status                 |
| 776140004 | Procurement - Actual Start Date    |
| 776140005 | Procurement - Actual End Date      |
| 776140006 | Procurement - Actual Awarding Date |
| 776140007 | Actual Contract Duration in Months |
| 776140008 | Project Updates                    |
| 776140009 | Project Submission Updates         |
| 576610001 | Activity Classification            |

### Status Reason Values

| Code | Value    |
| ---- | -------- |
| 1    | Active   |
| 2    | Inactive |

# 4. Relationships

## 4.1 System / Security Relationships

| Parent Table (Logical Name) | Child Table (Logical Name)          | Relationship Type | Lookup / Intersect Attribute | Description                                         |
| --------------------------- | ----------------------------------- | ----------------- | ---------------------------- | --------------------------------------------------- |
| User (systemuser)           | Team Membership (teammembership)    | One-to-Many (1:N) | systemuserid                 | One user can belong to multiple teams               |
| Team (team)                 | Team Membership (teammembership)    | One-to-Many (1:N) | teamid                       | One team can contain multiple users                 |
| User (systemuser)           | System User Roles (systemuserroles) | One-to-Many (1:N) | systemuserid                 | One user can have multiple security roles           |
| Security Role (role)        | System User Roles (systemuserroles) | One-to-Many (1:N) | roleid                       | One role can be assigned to multiple users          |
| Team (team)                 | Team Roles (teamroles)              | One-to-Many (1:N) | teamid                       | One team can have multiple security roles assigned  |
| Security Role (role)        | Team Roles (teamroles)              | One-to-Many (1:N) | roleid                       | One security role can be assigned to multiple teams |

## 4.2 Organization Hierarchy Relationships

| Parent Table (Logical Name)                     | Child Table (Logical Name)                      | Relationship Type      | Lookup Attribute                  | Description                                                     |
| ----------------------------------------------- | ----------------------------------------------- | ---------------------- | --------------------------------- | --------------------------------------------------------------- |
| Divisional Hierarchy (dga_divisional_hierarchy) | Divisional Hierarchy (dga_divisional_hierarchy) | Self-Referencing (1:N) | dga_parent_divisional_hierarchyid | Sector or parent entity can have child divisions                |
| Team (team)                                     | Divisional Hierarchy (dga_divisional_hierarchy) | One-to-Many (1:N)      | dga_teamid                        | Division/Sector can be explicitly mapped to a business team     |
| User (systemuser)                               | Divisional Hierarchy (dga_divisional_hierarchy) | One-to-Many (1:N)      | dga_director_systemuserid         | Director field references the supervising system user           |
| Divisional Hierarchy (dga_divisional_hierarchy) | Account Code (dga_account_code)                 | One-to-Many (1:N)      | dga_divisional_hierarchy          | Division can map and contain multiple structural account codes  |
| Divisional Hierarchy (dga_divisional_hierarchy) | AOP Cost Center (dga_aop_cost_center)           | One-to-Many (1:N)      | dga_divisional_hierarchy          | Division can map and track multiple organizational cost centers |
| Team (team)                                     | Divisional Hierarchy (dga_divisional_hierarchy) | One-to-Many (1:N)      | dga_director                      | Director user assigned to hierarchy                             |
| Team (team)                                     | Divisional Hierarchy (dga_divisional_hierarchy) | One-to-Many (1:N)      | dga_division_member_team_id       | Division member team assigned to hierarchy                      |
| Team (team)                                     | Divisional Hierarchy (dga_divisional_hierarchy) | One-to-Many (1:N)      | dga_team                          | Primary team assigned to hierarchy                              |

## 4.3 Cycle Relationships

| Parent Table (Logical Name)             | Child Table (Logical Name)                                | Relationship Type         | Lookup Attribute     | Description                                                            |
| --------------------------------------- | --------------------------------------------------------- | ------------------------- | -------------------- | ---------------------------------------------------------------------- |
| Assessment Cycle (dga_assessment_cycle) | Project Planning Instance (dga_project_planning_instance) | One-Dga_teamto-Many (1:N) | dga_assessment_cycle | One operational cycle can contain multiple Project planning instance   |
| Module Type (dga_module_type)           | Assessment Cycle (dga_assessment_cycle)                   | One-to-Many (1:N)         | dga_module_typeid    | Cycle can be associated with a module type for filtered system scoping |

## 4.4 AOP Project Core Relationships

| Parent Table (Logical Name)                  | Child Table (Logical Name)                                        | Relationship Type | Lookup Attribute       | Description                                                           |
| -------------------------------------------- | ----------------------------------------------------------------- | ----------------- | ---------------------- | --------------------------------------------------------------------- |
| AOP Projects (dga_aop_projects)              | AOP Project Budgets (dga_aop_project_budget)                      | One-to-Many (1:N) | dga_aop_project        | One activity can contain multiple distinct budget allocations         |
| AOP Project Budgets (dga_aop_project_budget) | AOP Project Budget Details (dga_aop_project_budget_details)       | One-to-Many (1:N) | dga_aop_project_budget | One parent budget record hosts multiple granular spending lines       |
| AOP Projects (dga_aop_projects)              | AOP Project Milestone Details (dga_aop_project_milestone_details) | One-to-Many (1:N) | dga_aop_project        | One project contains multiple operational progress milestones         |
| AOP Projects (dga_aop_projects)              | Dependency (dga_dependency)                                       | One-to-Many (1:N) | dga_aop_project        | One project explicitly tracks multiple internal/external dependencies |
| AOP Projects (dga_aop_projects)              | Procurement Plan (dga_procurement_plan)                           | One-to-Many (1:N) | dga_aop_project        | One activity maps to multiple standalone procurement line instances   |
| AOP Projects (dga_aop_projects)              | AOP Engagement Plan (dga_aop_engagement_plan)                     | One-to-Many (1:N) | dga_aop_project        | One activity links out to multiple stakeholder engagement plans       |
| AOP Projects (dga_aop_projects)              | Project Clarification (dga_projectclarification)                  | One-to-Many (1:N) | dga_aop_project        | One project activity handles multiple sequential audit clarifications |
| AOP Projects (dga_aop_projects)              | AOP Project Logs (dga_aop_project_logs)                           | One-to-Many (1:N) | dga_aop_project        | One activity tracks multiple history state and value logging changes  |

## 4.5 AOP Project Lookup Relationships

| Parent Table (Logical Name)                               | Child Table (Logical Name)      | Relationship Type | Lookup Attribute                    | Description                                                          |
| --------------------------------------------------------- | ------------------------------- | ----------------- | ----------------------------------- | -------------------------------------------------------------------- |
| Divisional Hierarchy (dga_divisional_hierarchy)           | AOP Projects (dga_aop_projects) | One-to-Many (1:N) | dga_sector / dga_department         | Sectors, departments, or divisions link directly to own activities   |
| User (systemuser)                                         | AOP Projects (dga_aop_projects) | One-to-Many (1:N) | dga_activity_lead                   | Identifies the particular system user leading the project operations |
| Objective (dga_objective)                                 | AOP Projects (dga_aop_projects) | One-to-Many (1:N) | dga_link_to_dge_strategic_objective | Maps activities to objectives, strategic KPIs, or pillars            |
| Account (account)                                         | AOP Projects (dga_aop_projects) | One-to-Many (1:N) | dga_accountid                       | Projects can link cleanly with corporate accounts or ADGE targets    |
| Project Planning Instance (dga_project_planning_instance) | AOP Projects (dga_aop_projects) | One-to-Many (1:N) | dga_project_planning_instance       | Projects can link to project planning instance                       |

## 4.6 Budget Relationships

| Parent Table (Logical Name)                  | Child Table (Logical Name)                                  | Relationship Type | Lookup Attribute       | Description                                                               |
| -------------------------------------------- | ----------------------------------------------------------- | ----------------- | ---------------------- | ------------------------------------------------------------------------- |
| Account Code (dga_account_code)              | AOP Project Budget Details (dga_aop_project_budget_details) | One-to-Many (1:N) | dga_account_code       | One chart-of-accounts code can be reused across multiple budgets          |
| AOP Project Budgets (dga_aop_project_budget) | AOP Project Budget Details (dga_aop_project_budget_details) | One-to-Many (1:N) | dga_aop_project_budget | Parent-to-child budget detail tracking breakdown hierarchy                |
| AOP Projects (dga_aop_projects)              | AOP Project Budgets (dga_aop_project_budget)                | One-to-Many (1:N) | dga_aop_project        | Activity-level encapsulation for grouping planned/actual funding accounts |

## 4.7 Procurement Relationships

| Parent Table (Logical Name)           | Child Table (Logical Name)              | Relationship Type | Lookup Attribute    | Description                                                          |
| ------------------------------------- | --------------------------------------- | ----------------- | ------------------- | -------------------------------------------------------------------- |
| AOP Projects (dga_aop_projects)       | Procurement Plan (dga_procurement_plan) | One-to-Many (1:N) | dga_aop_project     | Procurement target plans track up to single master parent activities |
| AOP Cost Center (dga_aop_cost_center) | Procurement Plan (dga_procurement_plan) | One-to-Many (1:N) | dga_aop_cost_centre | Links procurement execution paths to financial cost tracking centers |
| Category (dga_category)               | Procurement Plan (dga_procurement_plan) | One-to-Many (1:N) | dga_category_code   | Links sourcing lines with descriptive category definitions           |

## 4.8 Engagement Relationships

| Parent Table (Logical Name)                   | Child Table (Logical Name)                    | Relationship Type      | Lookup Attribute                        | Description                                                               |
| --------------------------------------------- | --------------------------------------------- | ---------------------- | --------------------------------------- | ------------------------------------------------------------------------- |
| AOP Projects (dga_aop_projects)               | AOP Engagement Plan (dga_aop_engagement_plan) | One-to-Many (1:N)      | dga_aop_project                         | Stakeholder communication plan paths map under specific activities        |
| Engagement Sub Type (dga_engagement_sub_type) | AOP Engagement Plan (dga_aop_engagement_plan) | One-to-Many (1:N)      | dga_sub_type / dga_engagement_type      | Sub-type structural classifications linked inside the plan rows           |
| Engagement Sub Type (dga_engagement_sub_type) | Engagement Sub Type (dga_engagement_sub_type) | Self-Referencing (1:N) | dga_parent_type                         | Tier hierarchical setup enabling Types to manage multiple child Sub-Types |
| Account (account)                             | AOP Engagement Plan (dga_aop_engagement_plan) | Many-to-Many / Lookup  | dga_ad_companies / dga_federal_entities | Accounts representing targeted federal entities, companies, or ADGEs      |

## 4.9 Clarification and Logs Relationships

| Parent Table (Logical Name)     | Child Table (Logical Name)                       | Relationship Type | Lookup Attribute       | Description                                                                    |
| ------------------------------- | ------------------------------------------------ | ----------------- | ---------------------- | ------------------------------------------------------------------------------ |
| AOP Projects (dga_aop_projects) | Project Clarification (dga_projectclarification) | One-to-Many (1:N) | dga_aop_project        | Tracks the entire workflow audit clarification history per activity block      |
| User (systemuser)               | Project Clarification (dga_projectclarification) | One-to-Many (1:N) | createdby              | System tracker matching the identity of the user raising the clarification     |
| AOP Projects (dga_aop_projects) | AOP Project Logs (dga_aop_project_logs)          | One-to-Many (1:N) | dga_aop_project        | Centralized location containing raw delta state parameter logs for an activity |
| User (systemuser)               | AOP Project Logs (dga_aop_project_logs)          | One-to-Many (1:N) | createdby / modifiedby | System audit trace fields capturing the author of the log modification entry   |

## 4.10 Ownership Relationships

**Note:** All custom tables configured using User or Team ownership contain standard polymorphic lookup attributes (ownerid) managing access rights dynamically inside the engine environment.

| Parent Table (Logical Name) | Child Table (Logical Name)                       | Relationship Type | Lookup Attribute | Description                                                            |
| --------------------------- | ------------------------------------------------ | ----------------- | ---------------- | ---------------------------------------------------------------------- |
| User/Team (systemuser/team) | AOP Projects (dga_aop_projects)                  | Owner (1:N)       | ownerid          | Project record ownership changes routes during approval phases         |
| User/Team (systemuser/team) | AOP Project Budgets (dga_aop_project_budget)     | Owner (1:N)       | ownerid          | Base ownership handling permissions on specific budget nodes           |
| User/Team (systemuser/team) | Procurement Plan (dga_procurement_plan)          | Owner (1:N)       | ownerid          | Controls read/write access privileges on procurement plan line records |
| User/Team (systemuser/team) | AOP Engagement Plan (dga_aop_engagement_plan)    | Owner (1:N)       | ownerid          | Governance mapping layer determining who manages the engagement plan   |
| User/Team (systemuser/team) | Project Clarification (dga_projectclarification) | Owner (1:N)       | ownerid          | Resolves which specific queues/users own outstanding clarifications    |
| User/Team (systemuser/team) | AOP Project Logs (dga_aop_project_logs)          | Owner (1:N)       | ownerid          | Security tracking owner assignment for transaction log visibility      |

# 5. Data Visibility Rules

| Role                     | Visibility Scope |
| ------------------------ | ---------------- |
| AOP - Division Member    | Own Division     |
| AOP - Division Director  | Own Division     |
| AOP - Strategy Team      | All Activities   |
| AOP - PMO                | All Activities   |
| AOP - Procurement Team   | All Activities   |
| AOP - Executive Director | Own Sector       |
| AOP - Director General   | All Activities   |

# 6. Notes

Detailed screen-level usage of these tables shall be defined in the Screen Specification Document.

Detailed approval transitions shall be defined in the Approval Workflow Specification.