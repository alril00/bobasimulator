const canvas = document.getElementById('bobaCanvas');
const ctx = canvas.getContext('2d');

let money = 100;
let cup = { tea: 0, syrup: 0, boba: 0 };
let stock = { tea: 10, syrup: 10, boba: 20 };
let balls = [];
let isPaused = false;

const MAX_CUP_VOLUME = 5.0; // Максимальный емкость стакана

// Рецепты меню
const menuDrinks = [
    { name: "🧋 Классический Боба", order: { tea: 2, syrup: 1, boba: 4 }, reward: 35 },
    { name: "🍯 Сладкий Сиропный", order: { tea: 1, syrup: 2, boba: 2 }, reward: 30 },
    { name: "⚫ Двойная Тапиока", order: { tea: 2, syrup: 0, boba: 6 }, reward: 38 },
    { name: "🥛 Кремовый Чай", order: { tea: 3, syrup: 1, boba: 2 }, reward: 40 }
];

const customerTypes = [
    { name: "Котик-сладкоежка", avatar: "🐱" },
    { name: "Лягушонок", avatar: "🐸" },
    { name: "Панда-хипстер", avatar: "🐼" },
    { name: "Зайчик", avatar: "🐰" }
];

let currentCustomer = null;
let timerId = null;
let currentPatience = 100;

function togglePause() {
    isPaused = !isPaused;
    document.getElementById('pauseOverlay').style.display = isPaused ? 'flex' : 'none';
    document.getElementById('pauseBtn').textContent = isPaused ? '▶ Играть' : '⏸ Пауза';
}

function toggleShop(show) {
    document.getElementById('shopOverlay').style.display = show ? 'flex' : 'none';
}

function buyStock(type, amount, price) {
    if (money >= price) {
        money -= price;
        stock[type] += amount;
        updateUI();
        showStatus(`🛒 Закуплено: +${amount} ${type === 'tea' ? 'чая' : type === 'syrup' ? 'сиропа' : 'шариков'}!`);
    } else {
        showStatus("❌ Недостаточно денег для заказа!");
    }
}

function spawnCustomer() {
    if (timerId) clearInterval(timerId);

    const type = customerTypes[Math.floor(Math.random() * customerTypes.length)];
    const drink = menuDrinks[Math.floor(Math.random() * menuDrinks.length)];

    currentCustomer = {
        ...type,
        drinkName: drink.name,
        order: drink.order,
        reward: drink.reward
    };

    document.getElementById('cAvatar').textContent = currentCustomer.avatar;
    document.getElementById('cName').textContent = currentCustomer.name;
    document.getElementById('cDrink').textContent = currentCustomer.drinkName;

    let orderHTML = `<span class="recipe-tag">🥛 Чай: ${drink.order.tea}</span>`;
    if (drink.order.syrup > 0) orderHTML += `<span class="recipe-tag">🍯 Сироп: ${drink.order.syrup}</span>`;
    if (drink.order.boba > 0) orderHTML += `<span class="recipe-tag">⚫ Тапиока: ${drink.order.boba}</span>`;
    document.getElementById('cOrder').innerHTML = orderHTML;

    currentPatience = 100;
    updatePatienceBar();
    document.getElementById('serveBtn').disabled = false;
    showStatus("");

    timerId = setInterval(() => {
        if (isPaused) return;

        currentPatience -= 1.0;
        updatePatienceBar();

        if (currentPatience <= 0) {
            clearInterval(timerId);
            showStatus("❌ Клиент не дождался и ушел!");
            document.getElementById('serveBtn').disabled = true;
            setTimeout(spawnCustomer, 2000);
        }
    }, 300);
}

function updatePatienceBar() {
    document.getElementById('patienceBar').style.width = `${Math.max(0, currentPatience)}%`;
}

// Расчет занимаемого объема
function getTotalOccupiedVolume(tempTea, tempSyrup, tempBoba) {
    return tempTea + tempSyrup + (tempBoba * (0.5 / 3));
}

function addIng(type, delta) {
    if (isPaused) return;

    if (delta > 0) {
        const nextTea = cup.tea + (type === 'tea' ? 1 : 0);
        const nextSyrup = cup.syrup + (type === 'syrup' ? 1 : 0);
        const nextBoba = cup.boba + (type === 'boba' ? 1 : 0);

        // Проверка превышения объема стакана
        if (getTotalOccupiedVolume(nextTea, nextSyrup, nextBoba) > MAX_CUP_VOLUME + 0.01) {
            showStatus("больше нельзя налить! Стакан полон");
            return;
        }

        if (stock[type] <= 0) {
            showStatus(`⚠️ Закончился ${type === 'tea' ? 'чай' : type === 'syrup' ? 'сироп' : 'тапиока'}! Закажите новые запасы.`);
            return;
        }

        stock[type]--;
        cup[type]++;
        if (type === 'boba') spawnBobaBall();
        showStatus("");
    } else {
        if (cup[type] > 0) {
            cup[type]--;
            stock[type]++;
            if (type === 'boba') balls.pop(); // Мгновенное удаление без анимации
            showStatus("");
        }
    }
    updateUI();
}

function spawnBobaBall() {
    const row = Math.floor(balls.length / 3);
    const targetY = 182 - (row * 9);
    const minX = 35 + (row * 1.2);
    const maxX = 95 - (row * 1.2);

    balls.push({
        x: Math.random() * (maxX - minX) + minX,
        y: 50,
        radius: 5,
        vy: 5,
        targetY: targetY
    });
}

function resetCup() {
    if (isPaused) return;
    stock.tea += cup.tea;
    stock.syrup += cup.syrup;
    stock.boba += cup.boba;

    cup = { tea: 0, syrup: 0, boba: 0 };
    balls = [];
    updateUI();
    showStatus("");
}

function serveCustomer() {
    if (isPaused || !currentCustomer) return;

    const o = currentCustomer.order;
    const isMatch = (cup.tea === o.tea) && (cup.syrup === o.syrup) && (cup.boba === o.boba);

    clearInterval(timerId);

    if (isMatch) {
        const tip = Math.floor(currentPatience / 10);
        const total = currentCustomer.reward + tip;
        money += total;
        showStatus(`✅ Отлично! +${total}$ (Чаевые: ${tip}$)`);
    } else {
        showStatus("❌ Ошибка в рецепте! Клиент ушел.");
    }

    document.getElementById('serveBtn').disabled = true;
    cup = { tea: 0, syrup: 0, boba: 0 };
    balls = [];
    updateUI();

    setTimeout(spawnCustomer, 2000);
}

function showStatus(text) {
    document.getElementById('statusMsg').textContent = text;
}

function updateUI() {
    document.getElementById('money').textContent = money;
    document.getElementById('valTea').textContent = cup.tea;
    document.getElementById('valSyrup').textContent = cup.syrup;
    document.getElementById('valBoba').textContent = cup.boba;

    document.getElementById('stockTea').textContent = stock.tea;
    document.getElementById('stockSyrup').textContent = stock.syrup;
    document.getElementById('stockBoba').textContent = stock.boba;
}

// Отрисовка стакана
function drawCup() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const topL = { x: 22, y: 50 };
    const topR = { x: 108, y: 50 };
    const botL = { x: 34, y: 188 };
    const botR = { x: 96, y: 188 };
    const totalHeight = botL.y - topL.y;
    const maxLiquidHeight = totalHeight - 15;

    // 1. Отрисовка Жидкости (только если налит чай или сироп)
    const hasLiquid = (cup.tea > 0 || cup.syrup > 0);

    if (hasLiquid) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(topL.x, topL.y);
        ctx.lineTo(topR.x, topR.y);
        ctx.lineTo(botR.x, botR.y);
        ctx.lineTo(botL.x, botL.y);
        ctx.closePath();
        ctx.clip();

        // Если есть жидкость, тапиока вытесняет её наверх
        const liquidVol = cup.tea + cup.syrup;
        const bobaVol = cup.boba * (0.5 / 3);
        const totalVol = liquidVol + bobaVol;

        const liquidHeight = Math.min(maxLiquidHeight, (totalVol / MAX_CUP_VOLUME) * maxLiquidHeight);

        // Чай
        if (cup.tea > 0) {
            ctx.fillStyle = 'rgba(224, 169, 109, 0.9)';
            ctx.fillRect(0, botL.y - liquidHeight, canvas.width, liquidHeight);
        }

        // Сироп
        if (cup.syrup > 0) {
            const syrupHeight = (cup.syrup / MAX_CUP_VOLUME) * maxLiquidHeight;
            const syrupY = botL.y - liquidHeight;

            ctx.fillStyle = 'rgba(150, 60, 20, 0.88)';
            ctx.fillRect(0, syrupY, canvas.width, syrupHeight);
        }

        ctx.restore();
    }

    // 2. Анимация падения шариков тапиоки
    if (!isPaused) {
        for (let i = 0; i < balls.length; i++) {
            let ball = balls[i];
            if (ball.y < ball.targetY) {
                ball.y += ball.vy;
                if (ball.y > ball.targetY) ball.y = ball.targetY;
            }
        }
    }

    // Отрисовка шариков тапиоки
    balls.forEach(ball => {
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#1c100b';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#3a2318';
        ctx.stroke();
        ctx.closePath();
    });

    // 3. Контур стакана
    ctx.beginPath();
    ctx.moveTo(topL.x, topL.y);
    ctx.lineTo(topR.x, topR.y);
    ctx.lineTo(botR.x, botR.y);
    ctx.lineTo(botL.x, botL.y);
    ctx.closePath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#634832';
    ctx.stroke();

    // Полная округлая крышка
    ctx.beginPath();
    ctx.arc(65, 50, 43, Math.PI, 0);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#8c6d53';
    ctx.stroke();
}

function animate() {
    drawCup();
    requestAnimationFrame(animate);
}

updateUI();
animate();
spawnCustomer();
