
// Tự động active tab đang mở
const currentPage = location.pathname.split("/").pop();
const items = document.querySelectorAll(".footer-item");
items.forEach(item => {
  const page = item.getAttribute("data-page");
  if (page === currentPage) {
    item.classList.add("active");
  }
});

const tg = Telegram.WebApp;
tg.ready();
tg.BackButton.show();
tg.BackButton.onClick(() => window.history.back());
const user = tg.initDataUnsafe?.user;

if (user) {
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
  const avatarUrl = user.username
    ? `https://t.me/i/userpic/320/${user.username}.jpg`
    : ''; // Telegram không có API chính thức để lấy avatar nếu không có username

  const nameEl = document.getElementById('telegram-name');
  const avatarEl = document.getElementById('telegram-avatar');

  nameEl.textContent = fullName || user.username || "Người dùng";
  if (avatarUrl) {
    avatarEl.src = avatarUrl;
    avatarEl.style.display = 'inline-block';
  }
}



const connectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://bmweb.site/tonconnect-manifest.json',
  buttonRootId: 'connect-wallet'
});




async function fetchJettons(walletAddress) {
  const loadingSpinner = document.getElementById('loading-spinner');
  const list = document.getElementById('jettons-list');
  const zeroList = document.getElementById('zero-balance-list');
  const seeAllBtn = document.getElementById('see-all-btn');
  const tokenHeader = document.getElementById('token-header');
  const totalAmountDiv = document.getElementById('total-amount');

  loadingSpinner.style.display = 'block';
  list.innerHTML = '';
  zeroList.innerHTML = '';
  zeroList.style.display = 'none';
  seeAllBtn.style.display = 'none';

  try {
    // 1. Lấy số dư TON Coin
    const tonRes = await fetch(`https://tonapi.io/v2/accounts/${walletAddress}`);
    const tonData = await tonRes.json();
    const tonBalance = parseFloat(tonData.balance) / 1e9;

    // 2. Lấy tỷ giá TON/USDT từ OKX
    const okxRes = await fetch('https://www.okx.com/api/v5/market/ticker?instId=TON-USDT');
    const okxData = await okxRes.json();
    const tonPrice = parseFloat(okxData.data[0].last);
    const tonOpen = parseFloat(okxData.data[0].open24h);
    const tonChange = ((tonPrice - tonOpen) / tonOpen) * 100;
    const changeSign = tonChange >= 0 ? '+' : '';

    // 3. Tính tổng giá trị quy đổi ra USDT
    const tonValueInUSDT = tonBalance * tonPrice;

    // 4. Lấy tỷ giá USDT/VND từ CoinGecko
    const vndRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd');
    const vndData = await vndRes.json();
    const usdtToVnd = vndData.tether.vnd;

    // 5. Tính giá trị TON quy đổi ra VND
    const tonValueInVND = tonValueInUSDT * usdtToVnd;

    // TON HTML
    const tonHTML = `
      <div class="jetton-item">
        <div class="jetton-logo-wrapper">
          <img src="/logo-coin/ton.jpg" alt="TON" class="jetton-logo">
          <img src="/logo-coin/ton.jpg" alt="TON Network" class="jetton-network-badge">
        </div>
        <div class="jetton-info">
          <strong>TON
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" alt="verified" width="16" class="verified-badge">
          </strong>
          <p>
            ${tonBalance.toLocaleString("vi-VN", { maximumFractionDigits: 9 })} TON ≈ 
            $${tonValueInUSDT.toLocaleString("en-US", { minimumFractionDigits: 2 })} ≈ 
            ${tonValueInVND.toLocaleString("vi-VN", { style: 'currency', currency: 'VND' })}
          </p>
          <p style="color: ${tonChange >= 0 ? 'green' : 'red'};">
            $${tonPrice.toFixed(3)} ≈ ${ (tonPrice * usdtToVnd).toLocaleString("vi-VN", { style: "currency", currency: "VND" }) }
            (${changeSign}${tonChange.toFixed(2)}%)
          </p>
        </div>
      </div>
    `;

    // Lấy giá BTC/USDT
    const btcRes = await fetch('https://www.okx.com/api/v5/market/ticker?instId=BTC-USDT');
    const btcData = await btcRes.json();
    const btcPrice = parseFloat(btcData.data[0].last);
    const btcOpen = parseFloat(btcData.data[0].open24h);
    const btcChange = ((btcPrice - btcOpen) / btcOpen) * 100;
    const btcChangeSign = btcChange >= 0 ? '+' : '';
    const btcPriceVND = btcPrice * usdtToVnd;

const btcHTML = `
  <div class="jetton-item">
    <div class="jetton-logo-wrapper">
      <img src="/logo-coin/btc.jpg" alt="BTC" class="jetton-logo">
      <img src="/logo-coin/btc.jpg" alt="Bitcoin Network" class="jetton-network-badge">
    </div>
    <div class="jetton-info">
      <strong>BTC
        <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" alt="verified" width="16" class="verified-badge">
      </strong>
      <p>
        $${btcPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} ≈ 
        ${btcPriceVND.toLocaleString("vi-VN", { style: 'currency', currency: 'VND' })}
        <span style="color: ${btcChange >= 0 ? 'green' : 'red'};">
          (${btcChangeSign}${btcChange.toFixed(2)}%)
        </span>
      </p>
    </div>
  </div>
`;

    // Lấy giá ETH/USDT
    const ethRes = await fetch('https://www.okx.com/api/v5/market/ticker?instId=ETH-USDT');
    const ethData = await ethRes.json();
    const ethPrice = parseFloat(ethData.data[0].last);
    const ethOpen = parseFloat(ethData.data[0].open24h);
    const ethChange = ((ethPrice - ethOpen) / ethOpen) * 100;
    const ethChangeSign = ethChange >= 0 ? '+' : '';
    const ethPriceVND = ethPrice * usdtToVnd;

    // ETH
const ethHTML = `
  <div class="jetton-item">
    <div class="jetton-logo-wrapper">
      <img src="/logo-coin/eth.jpg" alt="ETH" class="jetton-logo">
      <img src="/logo-coin/eth.jpg" alt="Ethereum Network" class="jetton-network-badge">
    </div>
    <div class="jetton-info">
      <strong>ETH
        <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" alt="verified" width="16" class="verified-badge">
      </strong>
      <p>
        $${ethPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })} ≈ 
        ${ethPriceVND.toLocaleString("vi-VN", { style: 'currency', currency: 'VND' })}
        <span style="color: ${ethChange >= 0 ? 'green' : 'red'};">
          (${ethChangeSign}${ethChange.toFixed(2)}%)
        </span>
      </p>
    </div>
  </div>
`;

    // Hiển thị lên giao diện
    list.innerHTML += tonHTML;
    list.innerHTML += btcHTML;
    list.innerHTML += ethHTML;



    // Nếu muốn hiển thị tổng giá trị USD ví:
    totalAmountDiv.innerHTML = `<p>Tổng trị giá: $${(tonBalance * tonPrice).toFixed(2)}</p>`;

// 4. Lấy danh sách jetton với giá USDT
const response = await fetch(`https://tonapi.io/v2/accounts/${walletAddress}/jettons?currencies=usdt`);
const data = await response.json();
loadingSpinner.style.display = 'none';

if (!data.balances || data.balances.length === 0) {
  tokenHeader.style.display = 'none';
  return;
}
tokenHeader.style.display = 'block';

const zeroBalanceJettons = [];

for (const jetton of data.balances) {
  const decimals = jetton.jetton.decimals || 9;
  const balance = parseFloat(jetton.balance) / (10 ** decimals);
  const formattedBalance = balance.toLocaleString("vi-VN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals > 5 ? 5 : decimals
  });

  const name = jetton.jetton.name || '';
  const symbol = jetton.jetton.symbol || '';
  const image = jetton.jetton.image || 'https://duccodedao.github.io/web/logo-coin/bmlogo.jpg';
  const jettonAddress = jetton.jetton.address;
  const isVerified = jetton.jetton.verification === "whitelist";
  const verifiedBadge = isVerified
    ? '<img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" alt="verified" width="16" class="verified-badge">'
    : '';

  const isSuspicious = !isVerified || image.includes("placeholder");
  const warningIcon = isSuspicious
    ? '<img src="https://cdn-icons-png.flaticon.com/512/1828/1828843.png" alt="warning" width="16" title="Token chưa xác minh hoặc đáng nghi" class="warning-badge">'
    : '';

// Định nghĩa giá thủ công cho nhiều jetton đặc biệt
const manualPrices = {
  '0:18326f7ba223e01d69238f38b419109ce7074104d79bbfbad48b3eff5228396b': 0.00000001,
  '0:fbdf9ac83a9f1f7b7ef6dad118636de0ee3e25cfd8f9f736bf08b3e13942560d': 0.00000005,
  // thêm các địa chỉ khác ở đây nếu cần
};

// Lấy giá USDT nếu có trong price.prices.USDT
let priceUSDT = jetton.price?.prices?.USDT || 0;

// Gán giá thủ công nếu có trong manualPrices
if (manualPrices[jetton.jetton.address] !== undefined) {
  priceUSDT = manualPrices[jetton.jetton.address];
}



  // Lấy % biến động 24h trong price.diff_24h.USDT (chuỗi dạng "−10.25%")
  const change24hRaw = jetton.price?.diff_24h?.USDT || null;

  // Chuyển đổi chuỗi biến động sang số (loại bỏ dấu % và dấu âm)
  let change24hNumber = null;
  if (change24hRaw) {
    // Loại bỏ dấu % và dấu âm đặc biệt nếu có
    const normalized = change24hRaw.replace(/[−–]/g, '-').replace('%', '');
    change24hNumber = parseFloat(normalized);
  }

  // Tạo dấu + hoặc - cho hiển thị
  const changeSign = (change24hNumber !== null && change24hNumber > 0) ? '+' : '';

  const priceAndChangeHTML = priceUSDT
    ? `<p>$${priceUSDT.toFixed(6)} ${change24hNumber !== null ? `(<span style="color: ${change24hNumber >= 0 ? 'green' : 'red'}">${changeSign}${change24hNumber.toFixed(2)}%</span>)` : ''}</p>`
    : '';

// Tính giá trị Jetton theo USDT và VND
const valueInUSDT = balance * priceUSDT;
const valueInVND = valueInUSDT * usdtToVnd;

const itemHTML = `
  <div class="jetton-item" onclick="fetchJettonInfo('${jettonAddress}')">
    <div class="jetton-logo-wrapper">
      <img src="${image}" alt="${name}" class="jetton-logo">
      <img src="/logo-coin/ton.jpg" alt="TON Network" class="jetton-network-badge">
    </div>
    <div class="jetton-info">
      <strong>${name} ${verifiedBadge} ${warningIcon}</strong>
      <p>${formattedBalance} ${symbol} ≈ $${valueInUSDT.toLocaleString("en-US", { minimumFractionDigits: 2 })} ≈ ${valueInVND.toLocaleString("vi-VN", { style: 'currency', currency: 'VND' })}</p>
      <p style="color: ${change24hNumber >= 0 ? 'green' : 'red'};">
        $${priceUSDT < 0.000001 ? '0' : parseFloat(priceUSDT.toFixed(6)).toString()}

 (${changeSign}${(change24hNumber ?? 0).toFixed(2)}%)
      </p>
    </div>
    <a href="https://tonviewer.com/${walletAddress}/jetton/${jettonAddress}" class="jetton-address-link" target="_blank">View</a>
  </div>
`;



      if (balance > 0) {
        list.innerHTML += itemHTML;
      } else {
        zeroBalanceJettons.push(itemHTML);
      }
    }

if (zeroBalanceJettons.length > 0) {
  seeAllBtn.style.display = 'block';
  let expanded = false; // trạng thái xem danh sách đã mở chưa

  seeAllBtn.onclick = () => {
    const zeroList = document.getElementById('zero-balance-list');
    if (!expanded) {
      zeroList.innerHTML = zeroBalanceJettons.join('');
      zeroList.style.display = 'block';
      seeAllBtn.textContent = '------- Collapse -------';
    } else {
      zeroList.style.display = 'none';
      seeAllBtn.textContent = '------- See all -------';
    }
    expanded = !expanded;
  };
}


  } catch (error) {
    loadingSpinner.style.display = 'none';
    console.error('ERROR', error);
  }
}











// Hàm fetchJettonInfo không thay đổi, giữ nguyên như cũ
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchJettonInfo(jettonAddress) {
  const jettonInfoContainer = document.getElementById('jetton-info-container');
  document.getElementById('jetton-info-popup').style.display = 'block';

  // Hiển thị spinner loading
jettonInfoContainer.innerHTML = `
  <div class="spinner"></div>
  <p style="text-align: center; margin-top: 10px;">Loading information...</p>
`;
  // Tạo delay giả 1.5 giây
  await delay(1500);


  try {
    const response = await fetch(`https://tonapi.io/v2/jettons/${jettonAddress}`);
    const jettonData = await response.json();

    if (jettonData) {
      const name = jettonData.metadata?.name || 'Không có';
      const symbol = jettonData.metadata?.symbol || 'Không có';
      const description = jettonData.metadata?.description || 'Không có mô tả';
const verification = jettonData.verification === 'whitelist'
  ? `<span style="color: #1877F2; font-weight: bold;">
      Verified
      <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" 
           alt="verified" width="16" style="vertical-align: middle; margin-bottom: 3px;">
    </span>`
  : `<span style="color: red; font-weight: bold;">
Not verified
      <img src="https://cdn-icons-png.flaticon.com/512/1828/1828843.png" 
           alt="warning" width="16" style="vertical-align: middle;  margin-bottom: 3px;">
    </span>`;


      const decimals = Number(jettonData.metadata?.decimals || 0);
      const holders = Number(jettonData.holders_count).toLocaleString();
      const rawSupply = BigInt(jettonData.total_supply);
      const supply = Number(rawSupply / BigInt(10 ** decimals)).toLocaleString();

      let imageUrl = jettonData.metadata?.image || '';
      if (imageUrl.startsWith('ipfs://')) {
        imageUrl = imageUrl.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/');
      }

      const websites = jettonData.metadata?.websites || [];
      let websitesHTML = '';
      if (websites.length > 0) {
        websitesHTML = `<p><strong>Website:</strong></p><ul>` +
          websites.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('') +
          `</ul>`;
      }

      const socials = jettonData.metadata?.social || [];
      let socialsHTML = '';
      if (socials.length > 0) {
        socialsHTML = `<p><strong>Mạng xã hội:</strong></p><ul>` +
          socials.map(link => `<li><a href="${link}" target="_blank">${link}</a></li>`).join('') +
          `</ul>`;
      }

const jettonHTML = `
  <img src="${imageUrl}" alt="${name}" style="width: 80px; height: 80px; border-radius: 10px; margin-bottom: 10px;">
  <p><strong>Name:</strong> ${name}</p>
  <p><strong>Symbol:</strong> ${symbol}</p>
  <p><strong>Address:</strong> <a href="https://tonviewer.com/${jettonAddress}" target="_blank">Tonviewer</a></p>
  <p><strong>Description:</strong> ${description}</p>
  <p><strong>Holders:</strong> ${holders}</p>
  <p><strong>Supply:</strong> ${supply}</p>
  <p><strong>Status:</strong> ${verification}</p>
  ${websitesHTML}
  ${socialsHTML}
`;


      jettonInfoContainer.innerHTML = jettonHTML;
    }
  } catch (error) {
    jettonInfoContainer.innerHTML = 'ERROR';
    console.error('ERROR', error);
  }
}

connectUI.onStatusChange(async (wallet) => {
  const disconnectButton = document.getElementById('disconnect-wallet');
  const connectOnlyDiv = document.getElementById('connect-only');
  const tokenHeader = document.getElementById('token-header');
  const seeAllBtn = document.getElementById('see-all-btn');
  const totalAmountDiv = document.getElementById('total-amount');

  if (wallet && wallet.account) {
    connectOnlyDiv.style.display = 'none';
    disconnectButton.style.display = 'block';
    tokenHeader.style.display = 'block';
    seeAllBtn.style.display = 'block';
    totalAmountDiv.style.display = 'none'; // Ẩn đi vì không còn hiển thị giá

    await fetchJettons(wallet.account.address);

    disconnectButton.addEventListener('click', () => {
      connectUI.disconnect();
      connectOnlyDiv.style.display = 'flex';
      disconnectButton.style.display = 'none';
      tokenHeader.style.display = 'none';
      seeAllBtn.style.display = 'none';
      totalAmountDiv.style.display = 'none';
      document.getElementById('jettons-list').innerHTML = '';
      document.getElementById('zero-balance-list').innerHTML = '';
    });
  } else {
    connectOnlyDiv.style.display = 'flex';
    disconnectButton.style.display = 'none';
    tokenHeader.style.display = 'none';
    seeAllBtn.style.display = 'none';
    totalAmountDiv.style.display = 'none';
    document.getElementById('jettons-list').innerHTML = '';
    document.getElementById('zero-balance-list').innerHTML = '';
  }
});
