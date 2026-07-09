/*!
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * This file is auto-generated. Do not modify it manually.
 * Changes to this file may be overwritten.
 */

export const dataSourcesInfo = {
  "dga_account_codes": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_account_codeid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "accounts": {
    "tableId": "",
    "version": "",
    "primaryKey": "accountid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_aop_cost_centers": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_aop_cost_centerid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_aop_engagement_plans": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_aop_engagement_planid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_aop_project_budget_detailses": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_aop_project_budget_detailsid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_aop_project_budgets": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_aop_project_budgetid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_aop_project_logses": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_aop_project_logsid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_aop_project_milestone_detailses": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_aop_project_milestone_detailsid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_aop_projectses": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_aop_projectsid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_categories": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_categoryid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_assessment_cycles": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_assessment_cycleid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_dependencies": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_dependencyid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_aop_projects_systemuserset": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_aop_projects_systemuserid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_divisional_hierarchies": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_divisional_hierarchyid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_engagement_sub_types": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_engagement_sub_typeid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_objectives": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_objectiveid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_procurement_plans": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_procurement_planid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "dga_project_planning_instances": {
    "tableId": "",
    "version": "",
    "primaryKey": "dga_project_planning_instanceid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "roles": {
    "tableId": "",
    "version": "",
    "primaryKey": "roleid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "systemuserrolescollection": {
    "tableId": "",
    "version": "",
    "primaryKey": "systemuserroleid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "teammemberships": {
    "tableId": "",
    "version": "",
    "primaryKey": "teammembershipid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "teamrolescollection": {
    "tableId": "",
    "version": "",
    "primaryKey": "teamroleid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "teams": {
    "tableId": "",
    "version": "",
    "primaryKey": "teamid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "systemusers": {
    "tableId": "",
    "version": "",
    "primaryKey": "systemuserid",
    "dataSourceType": "Dataverse",
    "apis": {}
  },
  "powerapps_v2__create_updateaopprojectrelatedaisummary": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "Run": {
        "path": "/{connectionId}/triggers/manual/run",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "input",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "api-version",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "202": {
            "type": "void"
          }
        }
      }
    }
  },
  "powerapps_v2__retrieveaopprojectdatafromexcel": {
    "tableId": "",
    "version": "",
    "primaryKey": "",
    "dataSourceType": "Connector",
    "apis": {
      "Run": {
        "path": "/{connectionId}/triggers/manual/run",
        "method": "POST",
        "parameters": [
          {
            "name": "connectionId",
            "in": "path",
            "required": true,
            "type": "string"
          },
          {
            "name": "input",
            "in": "body",
            "required": true,
            "type": "object"
          },
          {
            "name": "api-version",
            "in": "query",
            "required": true,
            "type": "string"
          }
        ],
        "responseInfo": {
          "202": {
            "type": "void"
          }
        }
      }
    }
  }
};
