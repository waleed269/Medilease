import axios from "axios";

const BASE_URL = "http://localhost:5000/api/wallet";

export const getWalletSummary = async () => {
  const response = await axios.get(`${BASE_URL}/summary`);
  return response.data;
};

export const getWallets = async (search = "") => {
  const response = await axios.get(`${BASE_URL}/wallets`, {
    params: { search },
  });
  return response.data;
};

export const depositFunds = async (amount) => {
  const response = await axios.post(`${BASE_URL}/deposit`, { amount });
  return response.data;
};

export const withdrawFunds = async (amount) => {
  const response = await axios.post(`${BASE_URL}/withdraw`, { amount });
  return response.data;
};

export const transferFunds = async (toUserId, amount, equipment) => {
  const response = await axios.post(`${BASE_URL}/transfer`, {
    toUserId,
    amount,
    equipment,
  });
  return response.data;
};