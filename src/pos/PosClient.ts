import axios, { AxiosInstance } from "axios";
import { SignJWT } from "jose";
import {
    EnrollmentRequest,
    EnrollmentResponse,
    TokenResponse,
    AddFeesRequest,
    AddFeesResponse,
    PreflightRequest,
    PreflightResponse,
    ConfirmationRequest,
    ConfirmationResponse,
    CancelRequest,
    CancelResponse,
    SweepRequest,
    SweepResponse,
    RedeemRequest,
    RedeemResponse,
    MerchantAddressResponse,
    PaymentStatusResponse,
} from "./types";

async function buildClientAssertion(
    tokenEndpoint: string,
    signingKeyId: string,
    signingKeySecret: string
): Promise<string> {
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const secretKey = Buffer.from(signingKeySecret, "hex");

    return new SignJWT({})
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(signingKeyId)
        .setSubject(signingKeyId)
        .setAudience(tokenEndpoint)
        .setIssuedAt(nowInSeconds)
        .setExpirationTime(nowInSeconds + 300)
        .sign(secretKey);
}

export class PosClient {
    http: AxiosInstance;

    constructor(params: { baseUrl?: string }) {
        this.http = axios.create({
            baseURL: params.baseUrl || "https://api.dev.rampatm.net/ramp/",
            timeout: 90 * 1000,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            validateStatus: () => true,
        });

        this.http.interceptors.response.use(
            (response) => {
                if (response.status >= 400) {
                    const body = response.data;
                    const errorMessage =
                        (body && (body.message || body.error || body.error_description)) ||
                        `Request failed with status ${response.status}`;
                    return Promise.reject(new Error(errorMessage));
                }
                return response;
            },
            (error) => {
                return Promise.reject(error);
            }
        );
    }

    setAuthToken(token: string) {
        this.http.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }

    enroll = async (params: EnrollmentRequest): Promise<EnrollmentResponse> => {
        return this.http
            .post<EnrollmentResponse>("api/v1/enrollment", params)
            .then((res) => res.data);
    };

    getAccessToken = async (params: EnrollmentRequest): Promise<TokenResponse> => {
        const enrollment = await this.enroll(params);

        const clientAssertion = await buildClientAssertion(
            enrollment.tokenEndpoint,
            enrollment.signingKeyId,
            enrollment.signingKeySecret
        );

        const bodyParams = new URLSearchParams({
            grant_type: "client_credentials",
            client_id: enrollment.signingKeyId,
            client_assertion_type: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
            client_assertion: clientAssertion,
        });

        const response = await fetch(enrollment.tokenEndpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: bodyParams.toString(),
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(`Error [${result.error}]: ${result.error_description}`);
        }

        this.setAuthToken(result.access_token);

        return result as TokenResponse;
    };

    addFees = async (params: AddFeesRequest): Promise<AddFeesResponse> => {
        return this.http
            .post<AddFeesResponse>("api/v1/addFees", params)
            .then((res) => res.data);
    };

    preflight = async (params: PreflightRequest): Promise<PreflightResponse> => {
        return this.http
            .post<PreflightResponse>("api/v1/preflight", params)
            .then((res) => res.data);
    };

    confirm = async (params: ConfirmationRequest): Promise<ConfirmationResponse> => {
        return this.http
            .post<ConfirmationResponse>("api/v1/confirmation", params)
            .then((res) => res.data);
    };

    cancel = async (params: CancelRequest): Promise<CancelResponse> => {
        return this.http
            .post<CancelResponse>("api/v1/cancel", params)
            .then((res) => res.data);
    };

    sweep = async (params: SweepRequest): Promise<SweepResponse> => {
        return this.http
            .post<SweepResponse>("api/v1/sweep", params)
            .then((res) => res.data);
    };

    redeem = async (params: RedeemRequest): Promise<RedeemResponse> => {
        return this.http
            .post<RedeemResponse>("api/v1/redeem", params)
            .then((res) => res.data);
    };

    getMerchantAddress = async (merchantId: string): Promise<MerchantAddressResponse> => {
        return this.http
            .get<MerchantAddressResponse>("api/v1/merchantAddress", { params: { merchantId } })
            .then((res) => res.data);
    };

    getPaymentStatus = async (
        merchantId: string,
        txHash?: string
    ): Promise<PaymentStatusResponse> => {
        return this.http
            .get<PaymentStatusResponse>("api/v1/paymentStatus", { params: { merchantId, txHash } })
            .then((res) => res.data);
    };
}
