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

    // Hiển thị TON (chỉ số lượng, không có giá USD)
    const tonHTML = `
      <div class="jetton-item">
        <img src="/logo-coin/ton.jpg" alt="TON" class="jetton-logo">
        <div class="jetton-info">
          <strong>TON
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Twitter_Verified_Badge.svg" 
                 alt="verified" width="16" class="verified-badge">
          </strong>
          <p>${tonBalance.toLocaleString("vi-VN", { maximumFractionDigits: 9 })} TON</p>
        </div>
      </div>
    `;
    list.innerHTML += tonHTML;

    // Ẩn tổng số tiền vì không có giá USD
    totalAmountDiv.innerHTML = '';

    // 4. Lấy danh sách jetton
    const response = await fetch(`https://tonapi.io/v2/accounts/${walletAddress}/jettons`);
    const data = await response.json();
    loadingSpinner.style.display = 'none';

    if (!data.balances || data.balances.length === 0) {
      tokenHeader.style.display = 'none';
      return;
    }
    tokenHeader.style.display = 'block';

    const zeroBalanceJettons = [];

    // Dùng for...of để await bên trong
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

      // Bỏ phần lấy giá và tính giá trị USD

      const itemHTML = `
        <div class="jetton-item" onclick="fetchJettonInfo('${jettonAddress}')">
          <img src="${image}" alt="${name}" class="jetton-logo">
          <div class="jetton-info">
            <strong>${name} ${verifiedBadge} ${warningIcon}</strong>
            <p>${formattedBalance} ${symbol}</p>
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
      seeAllBtn.onclick = () => {
        zeroList.innerHTML = zeroBalanceJettons.join('');
        zeroList.style.display = 'block';
        seeAllBtn.style.display = 'none';
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
