  
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

    // Khi trang được tải, hiển thị nút back của Telegram
    tg.ready();

    // Nút back luôn luôn bật
    tg.BackButton.show();

    // Khi bấm vào nút back của Telegram
    tg.BackButton.onClick(() => {
      window.history.back(); // Quay lại trang trước khi người dùng mở trang này
    });
  
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

  loadingSpinner.style.display = 'block';
  list.innerHTML = '';
  zeroList.innerHTML = '';
  zeroList.style.display = 'none';
  seeAllBtn.style.display = 'none';

  try {
    // Lấy số dư TON Coin
    const tonRes = await fetch(`https://tonapi.io/v2/accounts/${walletAddress}`);
    const tonData = await tonRes.json();
    const tonBalance = parseFloat(tonData.balance) / 1e9;
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

    // Lấy danh sách jetton
    const response = await fetch(`https://tonapi.io/v2/accounts/${walletAddress}/jettons`);
    const data = await response.json();
    loadingSpinner.style.display = 'none';

    if (!data.balances || data.balances.length === 0) {
      tokenHeader.style.display = 'none';
      return;
    }

    tokenHeader.style.display = 'block';

    const zeroBalanceJettons = [];

    data.balances.forEach(jetton => {
      const decimals = jetton.jetton.decimals || 9;
      const balance = parseFloat(jetton.balance) / 10 ** decimals;
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

      // 🚨 Nếu không verified hoặc không có ảnh => nghi ngờ
      const isSuspicious = !isVerified || image.includes("placeholder");
      const warningIcon = isSuspicious
        ? '<img src="https://cdn-icons-png.flaticon.com/512/1828/1828843.png" alt="warning" width="16" title="Token chưa xác minh hoặc đáng nghi" class="warning-badge">'
        : '';

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
    });

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
    console.error('Lỗi khi lấy jettons:', error);
  }
}

async function fetchJettonInfo(jettonAddress) {
  const jettonInfoContainer = document.getElementById('jetton-info-container');
  document.getElementById('jetton-info-popup').style.display = 'block';
  jettonInfoContainer.innerHTML = 'Đang tải thông tin...';

  try {
    const response = await fetch(`https://tonapi.io/v2/jettons/${jettonAddress}`);
    const jettonData = await response.json();

    if (jettonData) {
      const name = jettonData.metadata?.name || 'Không có';
      const symbol = jettonData.metadata?.symbol || 'Không có';
      const description = jettonData.metadata?.description || 'Không có mô tả';
      const verification = jettonData.verification === 'whitelist' ? 'Đã xác minh ✅' : 'Chưa xác minh ❌';
      const decimals = Number(jettonData.metadata?.decimals || 0);
      const holders = Number(jettonData.holders_count).toLocaleString();
      const rawSupply = BigInt(jettonData.total_supply);
      const supply = Number(rawSupply / BigInt(10 ** decimals)).toLocaleString();

      let imageUrl = jettonData.metadata?.image || '';
      if (imageUrl.startsWith('ipfs://')) {
        imageUrl = imageUrl.replace('ipfs://', 'https://cloudflare-ipfs.com/ipfs/');
      }

      const jettonHTML = `
        <img src="${imageUrl}" alt="${name}" style="width: 80px; height: 80px; border-radius: 10px; margin-bottom: 10px;">
        <p><strong>Tên:</strong> ${name}</p>
        <p><strong>Ký hiệu:</strong> ${symbol}</p>
        <p><strong>Mô tả:</strong> ${description}</p>
        <p><strong>Holders:</strong> ${holders}</p>
        <p><strong>Tổng cung:</strong> ${supply}</p>
        <p><strong>Xác minh:</strong> ${verification}</p>
      `;
      jettonInfoContainer.innerHTML = jettonHTML;
    }
  } catch (error) {
    jettonInfoContainer.innerHTML = 'Có lỗi xảy ra khi tải thông tin jetton.';
    console.error('Lỗi khi lấy thông tin jetton:', error);
  }
}





connectUI.onStatusChange(async (wallet) => {
  const disconnectButton = document.getElementById('disconnect-wallet');
  const connectOnlyDiv = document.getElementById('connect-only');
  const tokenHeader = document.getElementById('token-header');
  const seeAllBtn = document.getElementById('see-all-btn');

  if (wallet && wallet.account) {
    connectOnlyDiv.style.display = 'none';
    disconnectButton.style.display = 'block';
    tokenHeader.style.display = 'block';
    seeAllBtn.style.display = 'block';

    fetchJettons(wallet.account.address);

    disconnectButton.addEventListener('click', () => {
      connectUI.disconnect();
      connectOnlyDiv.style.display = 'flex';
      disconnectButton.style.display = 'none';
      tokenHeader.style.display = 'none';
      seeAllBtn.style.display = 'none';
      document.getElementById('jettons-list').innerHTML = '';
      document.getElementById('zero-balance-list').innerHTML = '';
    });
  } else {
    connectOnlyDiv.style.display = 'flex';
    disconnectButton.style.display = 'none';
    tokenHeader.style.display = 'none';
    seeAllBtn.style.display = 'none';
    document.getElementById('jettons-list').innerHTML = '';
    document.getElementById('zero-balance-list').innerHTML = '';
  }
});




document.getElementById('close-popup').addEventListener('click', () => {
  document.getElementById('jetton-info-popup').style.display = 'none';
});



