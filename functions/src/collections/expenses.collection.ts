import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

import { Report } from './reports.collection';

export interface Expense {
  amount: number;
  createdAt: FirebaseFirestore.Timestamp;
  processedEventId: string;
  reportId: string;
  updatedAt: FirebaseFirestore.Timestamp;
}

async function onExpenseCreateHandlerUnsafe(expenseSnap: admin.firestore.DocumentSnapshot, eventId: string) {
  const expenseData = expenseSnap.data() as Expense;
  // First we check if we already processed this expense
  if (expenseData.processedEventId) {
    return;
  }
  // For debugging purposes we will log the expense data
  console.log('New expense created:', JSON.stringify(expenseData));
  // Expense was created, so now we will add same extra data
  await expenseSnap.ref.update({
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    processedEventId: eventId,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  // But also we need to update report's total and update time
  // We know that each expense is associated with a reportId, let's find it and update it
  // First we check that a reportId was provided
  if (!expenseData.reportId) {
    console.warn('No reportId was provided!!11!!!');
    return;
  }

  const db = admin.firestore();
  const reportRef = db.collection('reports').doc(expenseData.reportId); // this is only the reference, it could exist or not D:
  const reportSnap = await reportRef.get();
  // We can check if there it is a report by reportId
  if (!reportSnap.exists) {
    console.warn(`No report found with reportId ${expenseData.reportId}`);
    return;
  }

  // It's all good, we can now "safely" update the report
  const reportData = reportSnap.data() as Report;
  // For debugging purposes we will log the report data
  console.log('Report to update: ', JSON.stringify(reportData));

  // This will simulate a loooooong task that can eventually trigger a concurrence error
  await new Promise(r => setTimeout(r, 10000));

  await reportRef.update({
    total: reportData.total + expenseData.amount,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

async function onExpenseCreateHandlerSafe(expenseRef: admin.firestore.DocumentReference, eventId: string): Promise<void> {
  const db = admin.firestore();
  return db.runTransaction(async (transaction) => {
    const expenseSnap = await transaction.get(expenseRef);
    const expenseData = expenseSnap.data() as Expense;
    if (expenseData.processedEventId) {
      throw new Error('already-processed');
    }
    if (!expenseData.reportId) {
      throw new Error('No reportId was provided');
    }
    const reportRef = db.collection('reports').doc(expenseData.reportId);
    const reportSnap = await transaction.get(reportRef);
    if (!reportSnap.exists) {
      throw new Error(`No report found with reportId ${expenseData.reportId}`);
    }
    const reportData = reportSnap.data() as Report;
    console.log('New expense created:', JSON.stringify(expenseData));
    transaction.update(expenseRef, {
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      processedEventId: eventId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('Report to update: ', JSON.stringify(reportData));
    // This will simulate a loooooong task that can eventually trigger a concurrence error, but the transaction will handle it!
    await new Promise(r => setTimeout(r, 10000));
    transaction.update(reportRef, {
      total: reportData.total + expenseData.amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
}

export const onExpenseCreateHandler = functions.firestore.document('expenses/{expenseId}').onCreate(async (expenseSnap, context) => {
  if (true) { // true for running unsafe version, false for safe version
    await onExpenseCreateHandlerUnsafe(expenseSnap, context.eventId);
  } else {
    await onExpenseCreateHandlerSafe(expenseSnap.ref, context.eventId).catch((error) => {
      console.error(error);
    });
  }
});

export const onExpenseDeleteHandler = functions.firestore.document('expenses/{expenseId}').onDelete(async (expenseSnap) => {
  const db = admin.firestore();
  return db.runTransaction(async(transaction) => {
    if (!expenseSnap.exists) {
      console.warn(`Expense ${expenseSnap.id} deletion already handled, ignoring execution`);
      return;
    }
    const expenseData = expenseSnap.data() as Expense;
    const reportRef = db.collection('reports').doc(expenseData.reportId);
    const reportSnap = await transaction.get(reportRef);
    if (!reportSnap.exists) {
      console.warn(`Report ${reportSnap.id} was not found, ignoring report total subtraction for Expense ${expenseSnap.id}`);
      return;
    }
    const reportData = reportSnap.data() as Report;
    transaction.update(reportRef, {
      total: reportData.total - expenseData.amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
});

export const onExpenseUpdateHandler = functions.firestore.document('expenses/{expensesId}').onUpdate(async (change, context) => {
  const expenseId = change.after.id;
  const expenseRef = change.after.ref;
  const beforeExpenseData = change.before.data() as Expense;
  const afterExpenseData = change.after.data() as Expense;
  console.info(`Expense ${expenseId} Before: `, JSON.stringify(beforeExpenseData));
  console.info(`Expense ${expenseId} After: `, JSON.stringify(afterExpenseData));
  if (beforeExpenseData.amount === afterExpenseData.amount) {
    console.debug(`Expense ${expenseId} update did not change amount property, ignoring any additional logic`);
    return;
  }
  const db = admin.firestore();
  await db.runTransaction(async (transaction) => {
    const currentExpenseSnap = await transaction.get(expenseRef);
    if (!currentExpenseSnap.exists) {
      console.warn(`Expense ${expenseId} was deleted while were are processing it, that should not happen D:!!1!`);
      return;
    }
    const currentExpenseData = currentExpenseSnap.data() as Expense;
    if (currentExpenseData.processedEventId === context.eventId) {
      console.warn(`Expense ${expenseId} update was already processed, ignoring any additional logic`);
      return;
    }
    const reportRef = db.collection('reports').doc(currentExpenseData.reportId);
    const reportSnap = await transaction.get(reportRef);
    if (!reportSnap.exists) {
      console.warn(`Report ${reportSnap.id} was not found, ignoring report total update for Expense ${expenseId}`);
      return;
    }
    const reportData = reportSnap.data() as Report;
    transaction.update(expenseRef, {
      processedEventId: context.eventId,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    transaction.update(reportRef, {
      total: reportData.total - beforeExpenseData.amount + afterExpenseData.amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
});

