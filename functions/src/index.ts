import * as admin from 'firebase-admin';

import { helloWorldHandler } from './api/hello-world';

import { onExpenseCreateHandler } from './collections/expenses.collection';
import { onReportCreateHandler } from './collections/reports.collection';

admin.initializeApp();
admin.firestore().settings({timestampsInSnapshots: true});

// APIS
export const helloWorld = helloWorldHandler;

// COLLECTIONS
export const onExpenseCreate = onExpenseCreateHandler;
export const onReportCreate = onReportCreateHandler;

