// Manual mock for expo-web-browser.
// Auto-applied for all tests in this project (adjacent to node_modules).
// New OAuth tests override this via explicit jest.mock('expo-web-browser', factory).
module.exports = {
  openAuthSessionAsync: jest.fn(),
  maybeCompleteAuthSession: jest.fn(),
};
