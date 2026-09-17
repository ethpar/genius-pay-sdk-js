export interface EnrollmentRequest {
    terminalSerialNumber: string;
    merchantId: string;
    activationCode: string;
}

export interface EnrollmentResponse {
    signingKeyId: string;
    signingKeySecret: string;
    tokenEndpoint: string;
    merchantName: string;
}

export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

export interface AddFeesRequest {
    totalSale: string;
}

export interface AddFeesResponse {
    totalSale: number;
    convenienceFee: number;
    processingFee: number;
    totalWithFees: number;
}

export interface PreflightRequest {
    totalWithFees: string;
    totalSale: string;
    merchantJwt: string;
    terminalId: string;
}

export interface PreflightResponse {
    preflightId: string;
    status: string;
    reason?: string | null;
}

export interface ConfirmationRequest {
    preflightId: string;
    networkTrackingId: string;
    approvalCode: string;
    totalSale: string;
    totalWithFees: string;
    maskedPan: string;
    cardholderName?: string | null;
    expirationDate: string;
    entryMode: string;
    cardBrand: string;
    aid?: string | null;
    applicationLabel?: string | null;
}

export interface ConfirmationResponse {
    walletAddress: string;
    walletPrivateKey: string;
    stablecoinAmount: string;
    receiptHeader: string;
    receiptFooter: string;
    transactionId: string;
}

export interface CancelRequest {
    preflightId: string;
    networkTrackingId?: string | null;
    rejectionCode: string;
    rejectionReason: string;
}

export interface CancelResponse {
    status: string;
    preflightId: string;
}

export interface SweepRequest {
    walletAddress: string;
    privateKey: string;
    merchantId: string;
}

export interface SweepResponse {
    status: string;
    amountSwept: number;
    merchantBalance: number;
    transactionId: number;
    blockchainTxHash: string;
}

export interface RedeemRequest {
    merchantId: string;
    amount: string;
    bankAccountId: string;
}

export interface RedeemResponse {
    status: string;
    redemptionId: string;
    amountRedeemed: string;
    fiatAmount: string;
    estimatedSettlement: string;
    merchantBalance: string;
}

export interface MerchantAddressResponse {
    merchantAddress: string;
    network: string;
    tokenContract: string;
    merchantName: string;
}

export interface PaymentStatusResponse {
    status: string;
    confirmations: number;
    ethparFinality: boolean;
    amount: string;
    fromAddress: string;
    txHash: string;
    timestamp: string;
}
