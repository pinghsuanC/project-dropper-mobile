// Each screen's states for the testing menu's `state` param (context/details/1020).
import {
  HomeState,
  PairingScanState,
  PairingWaitState,
  PropertiesState,
  RegisterState,
  ServerFilesState,
  ShareState,
  UploadState,
} from './screenStates';

const LISTS = {
  RegisterState,
  HomeState,
  PairingScanState,
  PairingWaitState,
  ServerFilesState,
  UploadState,
  ShareState,
  PropertiesState,
};

test.each(Object.entries(LISTS))('%s values are camelCase and unique', (_name, states) => {
  const values = Object.values(states);
  expect(values.length).toBeGreaterThan(0);
  for (const value of values) expect(value).toMatch(/^[a-z][A-Za-z]*$/);
  expect(new Set(values).size).toBe(values.length);
});

test('each screen has the states the prototype shows', () => {
  expect(Object.values(RegisterState)).toEqual(['unreachable', 'serverError']);
  expect(Object.values(HomeState)).toEqual(['unpaired', 'paired', 'serverError']);
  expect(Object.values(PairingScanState)).toEqual(['cameraNote', 'camera', 'error']);
  expect(Object.values(PairingWaitState)).toEqual(['error']);
  expect(Object.values(ServerFilesState)).toEqual(['empty', 'files']);
  expect(Object.values(UploadState)).toEqual(['inProgress', 'partialFailed', 'tooLarge', 'success']);
  expect(Object.values(ShareState)).toEqual(['ready', 'error']);
  expect(Object.values(PropertiesState)).toEqual(['notPaired']);
});
