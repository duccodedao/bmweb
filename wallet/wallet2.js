// --- Global Constants (Bạn có thể chuyển vào file constants.js nếu có) ---
const APP_CONFIG = {
    MANIFEST_URL: "https://bmweb.site/tonconnect-manifest.json",
    QR_CODE_WIDTH: 300,
    COPY_MESSAGE_DURATION: 2000,
    SWAL_TOAST_DURATION: 3000,
    JETTON_DEFAULT_DECIMALS: 9,
    API_RETRY_COUNT: 3, // Số lần thử lại API
    API_RETRY_DELAY_MS: 2000 // Thời gian chờ giữa các lần thử lại (ms)
};

const API_ENDPOINTS = {
    TONCENTER_GET_ADDRESS_INFO: 'https://toncenter.com/api/v2/getExtendedAddressInformation',
    TONAPI_GET_ACCOUNT: (address) => `https://tonapi.io/v2/accounts/${address}`, // TonAPI for account info
    TONAPI_GET_EVENTS: (address) => `https://tonapi.io/v2/accounts/${address}/events?initiator=false&subject_only=false&limit=100`,
    TONCENTER_DETECT_ADDRESS: 'https://toncenter.com/api/v2/detectAddress'
};

const EXTERNAL_LINKS = {
    TONVIEWER_TRANSACTION: (hash) => `https://tonviewer.com/transaction/${hash}`
};

// --- DOM Element Caching ---
const qrBtn = document.getElementById('show-qr-btn');
const qrModal = document.getElementById('qr-modal');
const closeQr = document.getElementById('close-qr');
const qrCanvas = document.getElementById('qr-canvas');
const qrAddressDisplay = document.getElementById('qr-address');
const copyBtn = document.getElementById('copy-btn');
const walletAddressEl = document.getElementById("wallet-address");
const walletBalanceEl = document.getElementById("wallet-balance");
const tonAmountInput = document.getElementById("ton-amount");
const connectOnlySection = document.getElementById("connect-only");
const mainContentSection = document.getElementById("main-content");
const disconnectBtn = document.getElementById("disconnect");
const transactionsList = document.getElementById("transactions-list");
const sendTonBtn = document.getElementById("send-ton-btn");
const toAddressInput = document.getElementById("to-address");
const memoTextInput = document.getElementById("memo-text");
const maxTonBtn = document.getElementById("max-ton-btn");

// --- Global Variables ---
let balanceTon = 0;
let connector;

// --- Utility Functions ---

/**
 * Delays execution for a given number of milliseconds.
 * @param {number} ms The delay time in milliseconds.
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Converts a raw TON address to its Base64url friendly form.
 * @param {string} rawAddress The raw TON address (e.g., "0:...")
 * @returns {Promise<string>} The Base64url address or the original raw address if conversion fails.
 */
async function convertRawAddressToB64url(rawAddress) {
    if (!rawAddress || rawAddress === "Unknown") return rawAddress;

    for (let i = 0; i < APP_CONFIG.API_RETRY_COUNT; i++) {
        try {
            const response = await fetch(`${API_ENDPOINTS.TONCENTER_DETECT_ADDRESS}?address=${rawAddress}`);
            if (!response.ok) {
                if (response.status === 429 && i < APP_CONFIG.API_RETRY_COUNT - 1) {
                    console.warn(`Rate limit hit for detectAddress, retrying in ${APP_CONFIG.API_RETRY_DELAY_MS / 1000}s...`);
                    await delay(APP_CONFIG.API_RETRY_DELAY_MS);
                    continue;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            if (data.ok && data.result && data.result.bounceable && data.result.bounceable.b64url) {
                return data.result.bounceable.b64url;
            } else {
                console.warn("Failed to convert address to b64url:", rawAddress, data);
                return rawAddress;
            }
        } catch (error) {
            console.error("Error converting raw address to b64url:", error);
            if (i < APP_CONFIG.API_RETRY_COUNT - 1) {
                await delay(APP_CONFIG.API_RETRY_DELAY_MS);
            }
        }
    }
    displayToast('error', '<strong>Failed to convert address after multiple retries.</strong>');
    return rawAddress; // Return original if all retries fail
}

/**
 * Safely parses nanoTON value to TON.
 * @param {string | number} value NanoTON value.
 * @returns {number} TON value.
 */
function safeParseNanoTON(value) {
    if (typeof value !== 'string' && typeof value !== 'number' || isNaN(value)) {
        return 0;
    }
    return parseFloat(value) / 1e9;
}

/**
 * Formats a number according to Vietnamese standards (dot for thousands, comma for decimals)
 * and removes trailing zeros in the decimal part.
 * Example: 1000.00 -> "1.000"
 * Example: 1000.12300 -> "1.000,123"
 *
 * @param {number} number The number to format.
 * @param {number} decimalPlaces The maximum number of decimal places to consider.
 * @returns {string} The formatted number as a string.
 */
function formatNumberVietnamese(number, decimalPlaces = 9) {
    if (typeof number !== 'number' || isNaN(number)) {
        return '';
    }

    // Convert to fixed decimal places to handle precision
    let fixed = number.toFixed(decimalPlaces);

    // Remove trailing zeros
    fixed = fixed.replace(/0+$/, '');

    // If the string ends with a dot after removing zeros, remove the dot too
    if (fixed.endsWith('.')) {
        fixed = fixed.slice(0, -1);
    }

    // Split into integer and decimal parts
    let parts = fixed.split('.');
    let integerPart = parts[0];
    let decimalPart = parts[1];

    // Format integer part with dot for thousands separator
    integerPart = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Combine with comma for decimal part if it exists
    return decimalPart ? `${integerPart},${decimalPart}` : integerPart;
}


/**
 * Truncates an address for display.
 * @param {string} addr The full address.
 * @param {number} start Number of characters to show at the start.
 * @param {number} end Number of characters to show at the end.
 * @returns {string} The truncated address.
 */
function truncateAddress(addr, start = 8, end = 8) {
    if (!addr || addr.length <= (start + end)) return addr;
    return `${addr.slice(0, start)}...${addr.slice(-end)}`;
}

/**
 * Converts a Base64 string (potentially URL-safe) to a hexadecimal string.
 * @param {string} base64 The Base64 string.
 * @returns {string} The hexadecimal string.
 */
function base64ToHex(base64) {
    const raw = atob(base64.replace(/-/g, '+').replace(/\_/g, '/'));
    let result = '';
    for (let i = 0; i < raw.length; i++) {
        result += raw.charCodeAt(i).toString(16).padStart(2, '0');
    }
    return result;
}

/**
 * Displays a SweetAlert2 toast notification.
 * @param {'success' | 'error' | 'warning' | 'info'} icon The icon type.
 * @param {string} htmlContent The HTML content for the toast.
 */
function displayToast(icon, htmlContent) {
    Swal.fire({
        icon: icon,
        html: htmlContent,
        position: 'top-right',
        toast: true,
        timer: APP_CONFIG.SWAL_TOAST_DURATION,
        showConfirmButton: false,
        padding: '10px',
        customClass: {
            popup: 'swal-popup-custom'
        }
    });
}

/**
 * Toggles the 'expanded' class on a memo element.
 * @param {HTMLElement} el The memo element.
 */
function toggleMemo(el) {
    el.classList.toggle("expanded");
}

// --- Event Handlers ---

async function handleShowQr() {
    const rawAddress = walletAddressEl.getAttribute("data-full-address-raw");
    if (!rawAddress) {
        displayToast('warning', '<strong>Wallet address not available. Please connect your wallet.</strong>');
        return;
    }

    const fullAddressB64url = await convertRawAddressToB64url(rawAddress);
    qrAddressDisplay.innerText = fullAddressB64url;
    QRCode.toCanvas(qrCanvas, fullAddressB64url, { width: APP_CONFIG.QR_CODE_WIDTH }, function(error) {
        if (error) console.error("QR Code generation error:", error);
    });
    qrModal.style.display = 'flex';
}

function handleCloseQr() {
    qrModal.style.display = 'none';
}

async function handleCopyAddress() {
    const fullAddressB64url = walletAddressEl.getAttribute("data-full-address-b64url");
    if (fullAddressB64url) {
        try {
            await navigator.clipboard.writeText(fullAddressB64url);
            const originalText = copyBtn.innerText;
            copyBtn.innerText = "Copied!";
            setTimeout(() => {
                copyBtn.innerText = originalText;
            }, APP_CONFIG.COPY_MESSAGE_DURATION);
            displayToast('success', '<strong>Address copied to clipboard!</strong>');
        } catch (err) {
            console.error("Failed to copy:", err);
            displayToast('error', '<strong>Failed to copy address. Please try again.</strong>');
        }
    } else {
        displayToast('warning', '<strong>No address to copy. Please connect your wallet.</strong>');
    }
}

function handleSetMaxTON() {
    if (balanceTon > 0) {
        // Use formatNumberVietnamese for display in input
        tonAmountInput.value = formatNumberVietnamese(balanceTon);
    }
}

async function handlePasteFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        if (text) {
            const pastedAddress = text.trim();
            toAddressInput.value = pastedAddress;
            displayToast('success', '<strong>Address pasted from clipboard!</strong>');
        } else {
            displayToast('warning', '<strong>No content found in clipboard.</strong>');
        }
    } catch (err) {
        console.error("Clipboard access error:", err);
        displayToast('error', '<strong>Browser denied clipboard access. Please paste manually (Ctrl + V).</strong>');
    }
}

async function handleSendTon() {
    const toAddress = toAddressInput.value.trim();
    // Convert formatted input back to a float for calculation
    // Replace dots (thousands separator) and commas (decimal separator)
    const amountTON = parseFloat(tonAmountInput.value.replace(/\./g, '').replace(/,/g, '.'));
    const memo = memoTextInput.value.trim();

    if (!toAddress || isNaN(amountTON) || amountTON <= 0) {
        displayToast('warning', '<strong>Please enter a valid address and amount.</strong>');
        return;
    }

    if (amountTON > balanceTon) {
        displayToast('error', `You can only send up to <strong>${formatNumberVietnamese(balanceTon)}</strong> TON.`);
        return;
    }

    try {
        const amountNanoTON = BigInt(Math.round(amountTON * 1e9));

        const tx = {
            validUntil: Math.floor(Date.now() / 1000) + 60,
            messages: [{
                address: toAddress,
                amount: amountNanoTON.toString(),
                payload: memo ? TON_CONNECT_UI.textToPayload(memo) : undefined
            }]
        };

        const result = await connector.sendTransaction(tx);

        const displayToAddress = await convertRawAddressToB64url(toAddress);
        displayToast('success', `You have successfully sent <strong>${formatNumberVietnamese(amountTON)}</strong> TON<br>to address <strong>${truncateAddress(displayToAddress)}</strong>.`);

        console.log("Transaction Result:", result);

        // Update wallet info after successful transaction
        if (connector.wallet?.account?.address) {
            await updateWalletInfo(connector.wallet.account.address);
        }

    } catch (err) {
        console.error("Error while sending TON:", err);
        let errorMessage = '<strong>Unknown error occurred.</strong>';
        if (err.message && err.message.includes('User rejected the transaction')) {
            errorMessage = '<strong>Transaction rejected by user.</strong>';
        } else if (err.message) {
            errorMessage = `<strong>Error:</strong> ${err.message}`;
        }
        displayToast('error', errorMessage);
    }
}


// --- Data Fetching & UI Update Functions ---

/**
 * Updates wallet balance and fetches all transaction history.
 * @param {string} rawAddress The raw address of the connected wallet.
 */
async function updateWalletInfo(rawAddress) {
    try {
        let accountData;
        for (let i = 0; i < APP_CONFIG.API_RETRY_COUNT; i++) {
            try {
                // Try fetching from TonAPI first for more robust service
                const tonApiRes = await fetch(API_ENDPOINTS.TONAPI_GET_ACCOUNT(rawAddress));
                if (!tonApiRes.ok) {
                    if (tonApiRes.status === 429 && i < APP_CONFIG.API_RETRY_COUNT - 1) {
                        console.warn(`Rate limit hit for TonAPI account info, retrying in ${APP_CONFIG.API_RETRY_DELAY_MS / 1000}s...`);
                        await delay(APP_CONFIG.API_RETRY_DELAY_MS);
                        continue;
                    }
                    // Fallback to Toncenter if TonAPI fails or is not found
                    console.warn(`TonAPI account info failed (${tonApiRes.status}), trying Toncenter...`);
                    const toncenterRes = await fetch(`${API_ENDPOINTS.TONCENTER_GET_ADDRESS_INFO}?address=${rawAddress}`);
                    if (!toncenterRes.ok) {
                        if (toncenterRes.status === 429 && i < APP_CONFIG.API_RETRY_COUNT - 1) {
                             console.warn(`Rate limit hit for Toncenter address info, retrying in ${APP_CONFIG.API_RETRY_DELAY_MS / 1000}s...`);
                             await delay(APP_CONFIG.API_RETRY_DELAY_MS);
                             continue;
                        }
                        throw new Error(`HTTP error! status: ${toncenterRes.status}`);
                    }
                    const toncenterData = await toncenterRes.json();
                    if (toncenterData.ok && toncenterData.result) {
                        // Map Toncenter response to a similar structure as TonAPI for consistency
                        accountData = {
                            address: toncenterData.result.address.account_address,
                            balance: toncenterData.result.balance,
                            // Add other fields if needed for display that Toncenter provides
                        };
                        break; // Successfully fetched from Toncenter
                    } else {
                        throw new Error("Invalid response from Toncenter API.");
                    }
                } else {
                    accountData = await tonApiRes.json();
                    break; // Successfully fetched from TonAPI
                }
            } catch (innerError) {
                console.error(`Attempt ${i + 1} to fetch account info failed:`, innerError);
                if (i < APP_CONFIG.API_RETRY_COUNT - 1) {
                    await delay(APP_CONFIG.API_RETRY_DELAY_MS);
                } else {
                    throw innerError; // Re-throw if all retries fail
                }
            }
        }

        if (!accountData) {
            throw new Error("Failed to fetch account data after multiple retries.");
        }

        const accountAddressRaw = accountData.address;
        const balanceNanoTON = parseInt(accountData.balance);
        balanceTon = safeParseNanoTON(balanceNanoTON);

        walletBalanceEl.textContent = `Balance: ${formatNumberVietnamese(balanceTon)} TON`;
        tonAmountInput.setAttribute("max", balanceTon);

        const accountAddressB64url = await convertRawAddressToB64url(accountAddressRaw);
        const shortAddressB64url = truncateAddress(accountAddressB64url);

        walletAddressEl.textContent = shortAddressB64url;
        walletAddressEl.setAttribute("data-full-address-raw", accountAddressRaw);
        walletAddressEl.setAttribute("data-full-address-b64url", accountAddressB64url);

        disconnectBtn.style.display = 'inline-block';
        connectOnlySection.style.display = "none";
        mainContentSection.style.display = "block";

        // Fetch and display ONLY Jetton transactions
        await fetchAndDisplayAllTransactions(accountAddressRaw);
    } catch (err) {
        console.error("Error fetching TON information:", err);
        displayToast('error', '<strong>Failed to load wallet balance and information. Please try connecting again.</strong>');
        resetWalletUI();
    }
}

/**
 * Fetches events from TonAPI, including Jetton transfers.
 * @param {string} walletAddressRaw The raw address of the wallet.
 * @returns {Promise<Array<Object>>} An array of event objects.
 */
async function fetchAccountEvents(walletAddressRaw) {
    for (let i = 0; i < APP_CONFIG.API_RETRY_COUNT; i++) {
        try {
            const response = await fetch(API_ENDPOINTS.TONAPI_GET_EVENTS(walletAddressRaw));
            if (!response.ok) {
                if (response.status === 429 && i < APP_CONFIG.API_RETRY_COUNT - 1) {
                    console.warn(`Rate limit hit for TonAPI events, retrying in ${APP_CONFIG.API_RETRY_DELAY_MS / 1000}s...`);
                    await delay(APP_CONFIG.API_RETRY_DELAY_MS);
                    continue;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.events || [];
        } catch (error) {
            console.error(`Attempt ${i + 1} to fetch account events failed:`, error);
            if (i < APP_CONFIG.API_RETRY_COUNT - 1) {
                await delay(APP_CONFIG.API_RETRY_DELAY_MS);
            } else {
                displayToast('error', '<strong>Failed to load transaction history after multiple retries.</strong>');
                return []; // Return empty array if all retries fail
            }
        }
    }
    return []; // Should not be reached, but for safety
}

/**
 * Fetches Jetton transactions (via events) and displays them.
 * @param {string} walletAddressRaw The raw address of the wallet.
 */
async function fetchAndDisplayAllTransactions(walletAddressRaw) {
    transactionsList.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <div>Loading transactions...</div>
        </div>
    `;

    const events = await fetchAccountEvents(walletAddressRaw);

    const allTransactions = []; // This will now only contain Jetton transactions
    const currentWalletB64url = await convertRawAddressToB64url(walletAddressRaw);

    // Process events to extract Jetton transfers
    for (const event of events) {
        for (const action of event.actions) {
            if (action.type === "JettonTransfer" && action.JettonTransfer) {
                const jt = action.JettonTransfer; // Alias for JettonTransfer object

                const sourceAddressRaw = jt.sender.address;
                const destinationAddressRaw = jt.recipient.address;

                const sourceAddressB64url = await convertRawAddressToB64url(sourceAddressRaw);
                const destinationAddressB64url = await convertRawAddressToB64url(destinationAddressRaw);
                
                // Determine if it's a received or sent transaction relative to the current wallet
                const isReceived = destinationAddressB64url === currentWalletB64url;
                const isSent = sourceAddressB64url === currentWalletB64url;

                const amountRaw = jt.amount;
                const jettonDecimals = jt.jetton.decimals || APP_CONFIG.JETTON_DEFAULT_DECIMALS;
                const amountJetton = parseFloat(amountRaw) / Math.pow(10, jettonDecimals);

                allTransactions.push({
                    type: 'JETTON',
                    utime: event.timestamp, // Use event timestamp
                    isReceived: isReceived,
                    isSent: isSent,
                    fromAddressRaw: sourceAddressRaw,
                    fromAddressB64url: sourceAddressB64url,
                    toAddressRaw: destinationAddressRaw,
                    toAddressB64url: destinationAddressB64url,
                    amountJetton,
                    jettonSymbol: jt.jetton.symbol || "JETTON",
                    jettonImage: jt.jetton.image || '/logo-coin/loi.png',
                    jettonName: jt.jetton.name || "Unknown Jetton",
                    jettonAddressRaw: jt.jetton.address,
                    jettonAddressB64url: await convertRawAddressToB64url(jt.jetton.address),
                    txHashRaw: event.event_id, // For events, the transaction hash might be event_id or a base_transaction hash
                    memo: jt.comment || "No Memo/Comment" // Extracting comment directly
                });
            }
        }
    }

    // Sort all transactions by time in descending order
    allTransactions.sort((a, b) => b.utime - a.utime);

    transactionsList.innerHTML = ""; // Clear loading message

    if (allTransactions.length === 0) {
        transactionsList.innerHTML = `
            <div class="no-transactions-message">
                <div>No Jetton transactions found.</div>
            </div>
        `;
        return;
    }

    // Render combined transactions
    for (const tx of allTransactions) {
        const time = new Date(tx.utime * 1000).toLocaleString();
        const txLink = EXTERNAL_LINKS.TONVIEWER_TRANSACTION(tx.txHashRaw);
        let labelText = '';
        let amountColor = 'var(--text-color)'; // Default text color, ensures fallback
        let iconPath = tx.jettonImage;
        let amountDisplay = '';
        let popupHandler = '';

        // Apply + or - based on transaction type and set color
        if (tx.isReceived) {
            amountColor = "green"; // Màu xanh cho giao dịch nhận
            amountDisplay = `+ ${formatNumberVietnamese(tx.amountJetton, 4)} ${tx.jettonSymbol}`; // Dấu + cho giao dịch nhận
        } else if (tx.isSent) {
            amountColor = "red"; // Màu đỏ cho giao dịch gửi
            amountDisplay = `- ${formatNumberVietnamese(tx.amountJetton, 4)} ${tx.jettonSymbol}`; // Dấu - cho giao dịch gửi
        } else {
            // Fallback for unexpected cases, though ideally not reached
            amountColor = 'var(--text-color)';
            amountDisplay = `${formatNumberVietnamese(tx.amountJetton, 4)} ${tx.jettonSymbol}`;
        }
        
        popupHandler = `openJettonTransactionPopup(${JSON.stringify(tx).replace(/'/g, "\\'")}, '${walletAddressRaw}')`;

        labelText = `${tx.jettonName || tx.jettonSymbol} Transfer`;

        const li = document.createElement("li");
        li.className = "transaction-item";
        li.innerHTML = `
        <div class="row">
            <div class="icon-label">
                <span class="icon"><img src="${iconPath}" alt="${tx.jettonSymbol}"></span>
                <span>${labelText}</span>
            </div>
            <div class="amount" style="color: ${amountColor};">${amountDisplay}</div>
        </div>
        <div class="row justify-between">
            <div class="address" title="${tx.txHashRaw}">
                <a href="${txLink}" target="_blank">🔎 Tonviewer</a>
            </div>
            <div class="time">${time}</div>
        </div>
        <div class="row justify-between">
            <div class="memo" onclick="toggleMemo(this)">${tx.memo}</div>
        </div>
        `;
        li.setAttribute('onclick', popupHandler);
        transactionsList.appendChild(li);
    }
}


// --- Popup Functions ---

/**
 * Opens a popup for TON transaction details. (Currently not used as only Jetton transactions are fetched)
 * @param {Object} tx The TON transaction object.
 * @param {string} currentWalletRawAddress The raw address of the current wallet.
 */
async function openTonTransactionPopup(tx, currentWalletRawAddress) {
    // This function will not be called in the current setup since TON transactions are no longer fetched.
    console.warn("openTonTransactionPopup called, but TON transactions are not currently displayed.");
    closePopup();

    const popup = document.createElement("div");
    popup.className = "popup-overlay";

    const fromAddressB64url = await convertRawAddressToB64url(tx.fromAddressRaw);
    const toAddressB64url = await convertRawAddressToB64url(tx.toAddressRaw);
    const currentWalletB64url = await convertRawAddressToB64url(currentWalletRawAddress);

    const isReceived = tx.isReceived && (toAddressB64url === currentWalletB64url);
    const isSent = tx.isSent && (fromAddressB64url === currentWalletB64url);

    let directionInfo = '';
    if (isSent) {
        directionInfo = `<p><strong>To Address:</strong> <span class="long-address">${toAddressB64url}</span></p>`;
    } else if (isReceived) {
        directionInfo = `<p><strong>From Address:</strong> <span class="long-address">${fromAddressB64url}</span></p>`;
    }

    popup.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="closePopup()"></button>
            <h2>TON Transaction Details</h2>
            <p><strong>Transaction ID:</strong> <span class="long-address">${tx.txHex}</span></p>
            <p><strong>Amount:</strong> ${formatNumberVietnamese(tx.amountTon)} TON</p>
            <p><strong>Fee:</strong> ${formatNumberVietnamese(tx.fee)} TON</p>
            <p><strong>Storage Fee:</strong> ${formatNumberVietnamese(tx.storageFee)} TON</p>
            <p><strong>Other Fee:</strong> ${formatNumberVietnamese(tx.otherFee)} TON</p>
            ${directionInfo}
            <p><strong>Memo:</strong> <span class="memo-content">${tx.memo}</span></p>
            <p><strong>Transaction Time:</strong> ${new Date(tx.utime * 1000).toLocaleString()}</p>
            <p><strong>View on Tonviewer:</strong> <a href="${EXTERNAL_LINKS.TONVIEWER_TRANSACTION(tx.txHex)}" target="_blank">🔎 Click Here</a></p>
        </div>
    `;

    document.body.appendChild(popup);
    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            closePopup();
        }
    });
}

/**
 * Opens a popup for Jetton transaction details.
 * @param {Object} op The Jetton operation object.
 * @param {string} currentWalletRawAddress The raw address of the current wallet.
 */
async function openJettonTransactionPopup(op, currentWalletRawAddress) {
    closePopup();

    const popup = document.createElement("div");
    popup.className = "popup-overlay";

    // Re-convert addresses to ensure they are b64url in the popup
    const sourceAddressB64url = await convertRawAddressToB64url(op.fromAddressRaw);
    const destinationAddressB64url = await convertRawAddressToB64url(op.toAddressRaw);
    const jettonAddressB64url = await convertRawAddressToB64url(op.jettonAddressRaw);
    const currentWalletB64url = await convertRawAddressToB64url(currentWalletRawAddress);

    const isReceived = op.isReceived && (destinationAddressB64url === currentWalletB64url);
    const isSent = op.isSent && (sourceAddressB64url === currentWalletB64url);

    let directionInfo = '';
    if (isSent) {
        directionInfo = `<p><strong>To Address:</strong> <span class="long-address">${destinationAddressB64url}</span></p>`;
    } else if (isReceived) {
        directionInfo = `<p><strong>From Address:</strong> <span class="long-address">${sourceAddressB64url}</span></p>`;
    }

    popup.innerHTML = `
        <div class="popup-content">
            <button class="popup-close" onclick="closePopup()"></button>
            <h2>Jetton Transaction Details</h2>
            <p><strong>Transaction ID:</strong> <span class="long-address">${op.txHashRaw}</span></p>
            <p><strong>Amount:</strong> ${formatNumberVietnamese(op.amountJetton)} ${op.jettonSymbol}</p>
            <p><strong>Jetton Name:</strong> ${op.jettonName}</p>
            <p><strong>Jetton Address:</strong> <span class="long-address">${jettonAddressB64url}</span></p>
            ${directionInfo}
            <p><strong>Memo:</strong> <span class="memo-content">${op.memo || "No Memo/Comment"}</span></p>
            <p><strong>Transaction Time:</strong> ${new Date(op.utime * 1000).toLocaleString()}</p>
            <p><strong>View on Tonviewer:</strong> <a href="${EXTERNAL_LINKS.TONVIEWER_TRANSACTION(op.txHashRaw)}" target="_blank">🔎 Click Here</a></p>
        </div>
    `;

    document.body.appendChild(popup);
    popup.addEventListener('click', (event) => {
        if (event.target === popup) {
            closePopup();
        }
    });
}

/**
 * Closes any active popup.
 */
function closePopup() {
    const popup = document.querySelector(".popup-overlay");
    if (popup) popup.remove();
}

// --- UI Reset Function ---
function resetWalletUI() {
    walletAddressEl.textContent = "...";
    walletAddressEl.setAttribute("data-full-address-raw", "");
    walletAddressEl.setAttribute("data-full-address-b64url", "");
    walletBalanceEl.textContent = "Số dư: ... TON";
    disconnectBtn.style.display = 'none';
    mainContentSection.style.display = "none";
    connectOnlySection.style.display = "flex";
    transactionsList.innerHTML = '';
    balanceTon = 0;
}

// --- Telegram Web App Integration ---
function initTelegramWebApp() {
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.BackButton.show();
        tg.BackButton.onClick(() => {
            window.history.back();
        });
    } else {
        console.warn("Telegram WebApp object not found. Running outside Telegram environment.");
    }
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    connector = new TON_CONNECT_UI.TonConnectUI({
        manifestUrl: APP_CONFIG.MANIFEST_URL,
        buttonRootId: "connect-wallet"
    });

    connector.onStatusChange(async (wallet) => {
        if (wallet) {
            // wallet.account.address is raw address
            await updateWalletInfo(wallet.account.address);
        } else {
            resetWalletUI();
        }
    });

    // Attach event listeners
    qrBtn.addEventListener('click', handleShowQr);
    closeQr.addEventListener('click', handleCloseQr);
    copyBtn.addEventListener('click', handleCopyAddress);
    disconnectBtn.addEventListener('click', () => connector.disconnect());
    sendTonBtn.addEventListener('click', handleSendTon);
    if (maxTonBtn) {
        maxTonBtn.addEventListener('click', handleSetMaxTON);
    }
    // document.getElementById("paste-btn").addEventListener("click", handlePasteFromClipboard); // If you have a paste button

    initTelegramWebApp();
});

// Expose functions to global scope for HTML `onclick`
window.copyAddress = handleCopyAddress;
window.setMaxTON = handleSetMaxTON;
window.toggleMemo = toggleMemo;
window.closePopup = closePopup;
window.pasteFromClipboard = handlePasteFromClipboard;
window.openTonTransactionPopup = openTonTransactionPopup; // Still exposed, but not used in current transaction display
window.openJettonTransactionPopup = openJettonTransactionPopup;
