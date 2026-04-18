// Manual mock for expo-clipboard.
// Auto-applied for all tests in this project (adjacent to node_modules).
module.exports = {
  setStringAsync: jest.fn().mockResolvedValue(undefined),
  getStringAsync: jest.fn().mockResolvedValue(''),
};