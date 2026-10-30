// Run only against the local Firebase Authentication emulator, never production.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import path from 'node:path';
const sdkDir=process.env.FIREBASE_TEST_SDK_DIR || '/workspace/.cache/firebase-auth-sdk';
const requireSDK=createRequire(path.join(sdkDir,'package.json'));
const {initializeApp,deleteApp}=requireSDK('firebase/app');
const {getAuth,connectAuthEmulator,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,EmailAuthProvider,reauthenticateWithCredential,updatePassword,deleteUser}=requireSDK('firebase/auth');
const app=initializeApp({apiKey:'demo-key',projectId:'demo-vidyalaya-one-app'},'auth-emulator-test');
const auth=getAuth(app);
connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});
const email=`synthetic-principal-${Date.now()}@example.invalid`;
const oldPassword='synthetic-old-password';
const newPassword='synthetic-new-password';
try {
  const created=await createUserWithEmailAndPassword(auth,email,oldPassword);
  const uid=created.user.uid;
  await signOut(auth);
  await assert.rejects(signInWithEmailAndPassword(auth,email,'incorrect-password'));
  const signedIn=await signInWithEmailAndPassword(auth,email,oldPassword);
  assert.equal(signedIn.user.uid,uid);
  await assert.rejects(reauthenticateWithCredential(auth.currentUser,EmailAuthProvider.credential(email,'incorrect-password')));
  await reauthenticateWithCredential(auth.currentUser,EmailAuthProvider.credential(email,oldPassword));
  await updatePassword(auth.currentUser,newPassword);
  await signOut(auth);
  await assert.rejects(signInWithEmailAndPassword(auth,email,oldPassword));
  const updated=await signInWithEmailAndPassword(auth,email,newPassword);
  assert.equal(updated.user.uid,uid);
  await deleteUser(auth.currentUser);
  console.log('PASS actual Firebase Auth emulator: account creation, password login, incorrect-password rejection, reauthentication, password update and login with new password');
} finally { await deleteApp(app); }
