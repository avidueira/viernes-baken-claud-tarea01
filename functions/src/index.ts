import * as admin from 'firebase-admin';

import { helloNameHandler } from './api/hello-name';
import { helloWorldHandler } from './api/hello-world';

import { onExpenseCreateHandler, onExpenseDeleteHandler, onExpenseUpdateHandler } from './collections/expenses.collection';
import { onReportCreateHandler, onReportDeleteHandler } from './collections/reports.collection';

admin.initializeApp();
admin.firestore().settings({timestampsInSnapshots: true});

// APIS
export const helloName = helloNameHandler;
export const helloWorld = helloWorldHandler;

// COLLECTIONS
// Expenses
export const onExpenseCreate = onExpenseCreateHandler;
export const onExpenseDelete = onExpenseDeleteHandler;
export const onExpenseUpdate = onExpenseUpdateHandler;

// Reports
export const onReportCreate = onReportCreateHandler;
export const onReportDelete = onReportDeleteHandler;

