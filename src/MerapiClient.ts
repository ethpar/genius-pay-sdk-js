import axios, { AxiosInstance, AxiosResponse } from 'axios'
import { getBundleId, getUserAgent } from './device-info'
import { BalanceResponse } from './models/Balance'
import { Atm } from './models/cashout/Atm'
import { CashoutRequest } from './models/cashout/CashoutRequest'
import { CreateCashoutResponse } from './models/cashout/CreateCashoutResponse'
import { FeatureFlags } from './models/FeatureFlags'
import {
    ICreditCardMultisigWallet,
    IGeneralMultisigWallet
} from './models/IMultisigWallet'
import { ITokenInfo } from './models/ITokenInfo'
import { IMultisigTransaction } from './models/IMultisigTransaction'
import { IUser } from './models/IUser'
import ResponseWrapper from './models/ResponseWrapper'
import { CashoutLimits } from './models/cashout/CashoutLimits'
import CashoutResponse from './models/cashout/CashoutResponse'
import { Transaction } from './models/Transaction'
import { LinkedCard } from './models/LinkedCard'
import { WalletAccount } from './models/WalletAccount'
import { MerchantLimit } from './models/MerchantLimit'

type AuthTokenProvider = () => Promise<string | null>

type Response<T> = {
    result: 'ok' | 'error'
    error: {
        code: string
        server_message: string
    } | null
    data: T
}

export class MerapiClient {
    http: AxiosInstance

    private deviceId?: string
    private userAgent?: string
    private bundleId?: string

    afterRequestCallback?: (
        responseBody: any,
        response: AxiosResponse
    ) => void | Promise<void>

    authTokenProvider?: AuthTokenProvider

    constructor(params: { baseUrl: string; clientId: string, deviceId: string }) {
        this.deviceId = params.deviceId;
        this.http = axios.create({
            baseURL: params.baseUrl,
            timeout: 30 * 1000,
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-Client-Id': params.clientId
            },
            validateStatus: () => true
        })

        this.http.interceptors.request.use(
            async (config) => {
                config.headers = config.headers ?? {}

                if (!this.userAgent) this.userAgent = await getUserAgent()
                if (!this.bundleId) this.bundleId = await getBundleId()

                const token = await this.authTokenProvider?.()

                if (token) config.headers.Authorization = token
                if (this.deviceId) config.headers['X-Device-ID'] = this.deviceId
                if (this.userAgent)
                    config.headers['User-Agent'] = this.userAgent
                if (this.bundleId) config.headers['X-Bundle-Id'] = this.bundleId

                return config
            },
            (error) => Promise.reject(error)
        )

        this.http.interceptors.response.use(
            (response) => {
                const body = response.data

                this.afterRequestCallback?.call(null, body, response)

                const errorMessage =
                    body?.error?.server_message || body?.error?.code
                if (errorMessage) {
                    return Promise.reject(new Error(errorMessage))
                }
                return response
            },
            (error) => {
                return Promise.reject(error)
            }
        )
    }

    setAuthTokenProvider(provider: AuthTokenProvider) {
        this.authTokenProvider = provider
    }

    generateLoginCode = async (params: {
        contact: string
        password?: string
    }): Promise<void> => {
        await this.http.post('/wallet/login/code', params)
    }

    confirmLoginCode = async (params: {
        contact: string
        code: string
        xpub: string
        masterFingerprint: string
        baseDerivationPath?: string
    }): Promise<{
        sessionKey: string
    }> => {
        params.baseDerivationPath || "m/44'/60'/0'"
        return this.http
            .post<
                Response<{ sessionKey: string }>
            >(
                '/wallet/login/confirm',
                params
            )
            .then((res) => res.data.data)
    }

    getCurrentUser = async (): Promise<IUser> => {
        return this.http.get<IUser>('/wallet/users/me').then((res) => res.data)
    }

    updateProfile = async (params: {
        firstName: string
        lastName: string
    }): Promise<IUser> => {
        return this.http
            .post<IUser>('/wallet/profile', {
                first_name: params.firstName,
                second_name: params.lastName
            })
            .then((res) => res.data)
    }

    getBalances = (
        address: string,
        tokens: {
            tokenAddress: string | null
        }[]
    ): Promise<BalanceResponse[]> => {
        return this.http
            .post(`/wallet/blockchain/${address}/get-balance`, {
                tokens
            })
            .then((res) => res.data)
    }

    setUserPublicAddress = async (params: { address: string }) => {
        await this.http.post('/wallet/users/set-address', params)
    }

    getDefaultTokens = (): Promise<ITokenInfo[]> => {
        return this.http
            .get<ITokenInfo[]>(`/wallet/blockchain/tokens`)
            .then((res) => res.data)
    }

    createMultisigWallet = (params: {
        name: string
        signers: string[]
        threshold: number
    }): Promise<IGeneralMultisigWallet> => {
        return this.http
            .post<IGeneralMultisigWallet>('/wallet/wallets', params)
            .then((res) => res.data)
    }

    acceptMultisigWallet = async (walletId: string) => {
        await this.http.post(`/wallet/wallets/${walletId}/accept`, { walletId })
    }

    getMultisigWallets = (): Promise<IGeneralMultisigWallet[]> => {
        return this.http
            .get<IGeneralMultisigWallet[]>('/wallet/wallets')
            .then((res) => res.data)
    }

    createMultisigTransaction = (params: {
        walletId: string
        assetType: 'native' | 'erc20'
        to: string
        amount: string
        tokenAddress: string | null
        remark: string | null
    }): Promise<IMultisigTransaction> => {
        return this.http
            .post<IMultisigTransaction>('/wallet/tx', params)
            .then((res) => res.data)
    }

    getMultisigWalletTransactions = (
        walletId: string
    ): Promise<IMultisigTransaction[]> => {
        return this.http
            .get<IMultisigTransaction[]>(`/wallet/wallets/${walletId}/tx`)
            .then((res) => res.data)
    }

    getMultisigWalletTransaction = async (
        txId: string
    ): Promise<IMultisigTransaction> => {
        return this.http
            .get<IMultisigTransaction>(`/wallet/tx/${txId}`)
            .then((res) => res.data)
    }

    addMultisigTxSignature = (
        txId: string,
        data: { txid: string; address: string; signature: string }
    ): Promise<IMultisigTransaction> => {
        return this.http
            .post<IMultisigTransaction>(`/wallet/tx/${txId}/signature`, data)
            .then((res) => res.data)
    }

    executeTransaction = (txId: string): Promise<IMultisigTransaction> => {
        return this.http
            .post<IMultisigTransaction>(`/wallet/tx/${txId}/execute`, {
                txid: txId
            })
            .then((res) => res.data)
    }

    getCCWallet = async (): Promise<ICreditCardMultisigWallet | null> => {
        const response =
            await this.http.get<ICreditCardMultisigWallet>('/wallet/ccwallet')
        const wallet = response.data
        if (wallet && Object.keys(wallet).length > 0) {
            return wallet as ICreditCardMultisigWallet
        }
        return null
    }

    getCCWalletTransactions = (
        walletId: string
    ): Promise<IMultisigTransaction[]> => {
        return this.http
            .get<IMultisigTransaction[]>(`/wallet/ccwallet/${walletId}/tx`)
            .then((res) => res.data)
    }

    createCCWallet = (params: {
        pan: string
    }): Promise<ICreditCardMultisigWallet> => {
        return this.http
            .post<ICreditCardMultisigWallet>('/wallet/ccwallet', params)
            .then((res) => res.data)
    }

    executePosTransaction = (params: {
        destination: string
        tokenAddress?: string
        assetType: 'native' | 'erc20'
        panHash: string
        amount: string
        remark: string
        merchant: string
        confirmations?: number
    }): Promise<IMultisigTransaction> => {
        return this.http
            .post<IMultisigTransaction>('/wallet/tx/pos', params)
            .then((res) => res.data)
    }

    getTokenInfo = async (tokenAddress: string): Promise<ITokenInfo | null> => {
        return this.http
            .get<ITokenInfo | null>(
                `/wallet/blockchain/${tokenAddress}/token-info`
            )
            .then((res) => res.data)
    }

    getFeatureFlags = async (): Promise<FeatureFlags> => {
        // TODO: remove mock
        return {
            multisignatureWallet: true,
            paymentWallet: true
        }
    }

    markTopup = async (
        walletId: string,
        hash: string
    ): Promise<IMultisigTransaction> => {
        return this.http
            .post<IMultisigTransaction>(`/wallet/ccwallet/${walletId}/topup`, {
                walletId,
                hash
            })
            .then((res) => res.data)
    }

    // cashout

    getCashoutLimits = async (atmId: string): Promise<CashoutLimits> => {
        return this.http
            .get<CashoutLimits>(`/cashout/limits?atm_id=${atmId}`)
            .then((res) => res.data)
    }

    getAtmList = async () => {
        const response =
            await this.http.get<ResponseWrapper<{ items: Atm[] }>>(
                '/cashout/atm/list'
            )
        return response.data.data.items
    }

    sendVerificationWord = async (params: {
        firstName: string
        lastName: string
        phoneNumber: string
    }) => {
        const data = new URLSearchParams()
        data.append('first_name', params.firstName)
        data.append('last_name', params.lastName)
        data.append('phone_number', params.phoneNumber)
        data.append('word_code', '1')
        data.append('_t', new Date().getTime().toString())

        await this.http.post('/cashout/pcode/verify', data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        })
    }

    createCashoutRequest = async (params: {
        atmId: number
        amount: number
    }): Promise<CreateCashoutResponse> => {
        const response = await this.http.post<
            ResponseWrapper<{
                items: [
                    {
                        secure_code: string
                        address: string
                        usd_amount: number
                        psc_amount: number
                        btc_whole_unit_price: number
                    }
                ]
            }>
        >('/cashout/pcode', {
            atm_id: params.atmId,
            amount: params.amount
        })
        const result = response.data.data.items[0]

        return {
            secureCode: result.secure_code,
            address: result.address,
            usdAmount: result.usd_amount,
            pscAmount: result.psc_amount,
            btcWholeUnitPrice: result.btc_whole_unit_price
        }
    }

    getCashOutRequest = async (cashCode: string): Promise<CashoutRequest> => {
        const response = await this.http.get<
            ResponseWrapper<{
                items: CashoutResponse[]
            }>
        >(`/cashout/pcode/${cashCode}`)
        const result = response.data.data.items[0]
        return buildCashoutItem(result)
    }

    getCashOutRequests = async (): Promise<CashoutRequest[]> => {
        const response = await this.http.get<
            ResponseWrapper<{
                items: []
            }>
        >('/cashout/pcodes')
        const result = response.data.data.items
        return result.map(buildCashoutItem)
    }

    linkCardToAddress = async (params: {
        address: string
        cardhash: string
        lastDigits: string
        firstDigit: string
    }): Promise<void> => {
        await this.http.post<ResponseWrapper<{ items: [{}] }>>(
            '/cashout/card/link',
            {
                address: params.address,
                cardhash: params.cardhash,
                last_digits: params.lastDigits,
                first_digit: params.firstDigit
            }
        )
    }

    getAddressByCardHash = async (
        cardhash: string
    ): Promise<string | undefined> => {
        const response = await this.http.get<
            ResponseWrapper<{ items: [{ address: string } | undefined] }>
        >(`/cashout/card/link?cardhash=${cardhash}`)
        return response.data.data.items[0]?.address
    }

    getLinkedCardsCount = async (): Promise<number> => {
        const response = await this.http.post<
            ResponseWrapper<{ items: [{ linked_cards_count: number }] }>
        >('/cashout/card/link/count')
        return response.data.data.items[0].linked_cards_count
    }

    unlinkCard = async (params: { cardHash: string }): Promise<void> => {
        await this.http.delete('/cashout/card', {
            data: { cardhash: params.cardHash }
        })
    }

    getLinkedCards = async (): Promise<LinkedCard[]> => {
        const response = await this.http.get<
            ResponseWrapper<{
                items: {
                    last_digits: string | null
                    card_hash: string
                    address: string
                    first_digit: string | null
                }[]
            }>
        >('/cashout/card/links')
        return response.data.data.items.map((item) => {
            return {
                address: item.address,
                cardHash: item.card_hash,
                lastDigits: item.last_digits,
                firstDigit: item.first_digit
            }
        })
    }

    submitTransaction = async (params: {
        transaction: string
    }): Promise<{
        hash: string
    }> => {
        const response = await this.http.post<{ hash: string }>(
            '/wallet/transaction',
            params
        )
        return response.data
    }

    getRpcUrl = async (): Promise<string> => {
        const response = await this.http.get<{ nodeUrl: string }>(
            '/wallet/service/info'
        )
        return response.data.nodeUrl
    }

    getTransactions = async (): Promise<Transaction[]> => {
        const response = await this.http.get<Transaction[]>(
            '/wallet/transactions'
        )
        return response.data
    }

    // wallet accounts

    registerXpub = async (params: {
        xpub: string
        baseDerivationPath: string
        masterFingerprint: string
    }): Promise<void> => {
        await this.http.post('/wallet/register', params)
    }

    createAccount = async (params: { name: string }): Promise<void> => {
        await this.http.post('/wallet/account', { name: params.name })
    }

    updateAccountLabel = async (id: string, label: string): Promise<void> => {
        await this.http.post(`/wallet/account/${id}`, {
            account_label: label
        })
    }

    activateAccount = async (id: string): Promise<void> => {
        await this.http.post(`/wallet/account/${id}/activate`)
    }

    deactivateAccount = async (id: string): Promise<void> => {
        await this.http.post(`/wallet/account/${id}/deactivate`)
    }

    getAccounts = async (options?: {
        includeDisabled?: boolean
    }): Promise<WalletAccount[]> => {
        const query = `active_only=${!options?.includeDisabled}`
        const response = await this.http.get<WalletAccount[]>(
            `/wallet/accounts?${query}`
        )
        return response.data
    }

    // merchant

    getAllLimits = async (): Promise<MerchantLimit[]> => {
        const response = await this.http.get<MerchantLimit[]>(
            `/wallet/merchant/limits`
        )
        return response.data
    }

    getMerchantLimit = async (
        merchantId: string
    ): Promise<MerchantLimit | null> => {
        const response = await this.http.get<MerchantLimit>(
            `/wallet/merchant/${merchantId}/limits`
        )
        return response.data || null
    }

    setMerchantLimit = async (
        merchantId: string,
        limits: Omit<MerchantLimit, 'merchantId' | 'merchant'>
    ): Promise<void> => {
        await this.http.post(`/wallet/merchant/${merchantId}/limits`, limits)
    }
}

function buildCashoutItem(result: CashoutResponse): CashoutRequest {
    return {
        secureCode: result.secure_code,
        pcode: result.pcode,
        status: result.status as any,
        address: result.address,
        usdAmount: result.usd_amount,
        btcAmount: result.btc_amount,
        btcWholeUnitPrice: result.btc_whole_unit_price,
        expiration: result.expiration,
        atmId: result.atm_id,
        locDescription: result.loc_description,
        locLat: result.loc_lat,
        locLon: result.loc_lon
    }
}
