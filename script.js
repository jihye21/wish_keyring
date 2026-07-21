// script.js
const { Engine, Render, Runner, Bodies, Composite, Mouse, MouseConstraint } = Matter;

const engine = Engine.create();

engine.positionIterations = 10; 
engine.velocityIterations = 10;

const container = document.getElementById('keyring-box');

const render = Render.create({
    element: container,
    engine: engine,
    options: { 
        width: 320, height: 320, 
        background: 'transparent',
        wireframes: false 
    }
});

let appData = {
    currentKeyringId: null,
    keyrings: []
};

window.addEventListener('load', () => {
    loadAllData();
});

// 벽
function createWalls() {
    const wallOptions = { isStatic: true, render: { visible: false } };
    const walls = [];
    const radius = 170;
    const segments = 40; 
    
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = 160 + Math.cos(angle) * radius;
        const y = 160 + Math.sin(angle) * radius;
        walls.push(Bodies.rectangle(x, y, 40, 40, wallOptions)); 
       }
    return walls;
}
Composite.add(engine.world, createWalls());

//마우스 상호작용
const mouse = Mouse.create(render.canvas);
const mouseConstraint = MouseConstraint.create(engine, 
{ 
    mouse: mouse,
    constraint: {
        stiffness: 0.2,
        render: { visible: false }
    }
});
Composite.add(engine.world, mouseConstraint);

Render.run(render);
Runner.run(Runner.create(), engine);

// 휴대폰 움직임 감지
if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', (event) => {
        // 센서 데이터 가져오기
        const x = event.accelerationIncludingGravity.x;
        const y = event.accelerationIncludingGravity.y;

        // 물리 엔진의 중력 방향을 핸드폰 기울기에 맞춰 수정
        engine.world.gravity.x = x * 0.1;
        engine.world.gravity.y = -y * 0.1;
    });
}

let totalAmount = 0;
let selectedBody = null;
// 이모티콘 추가
function addEmoji() {
    const name = document.getElementById('itemName').value;
    const price = parseInt(document.getElementById('itemPrice').value) || 0;
    const emoji = document.getElementById('emojiInput').value;
    
    if(!emoji || !name) {
        alert("이름과 이모티콘을 입력해주세요.");
        return;
    }

    const goal = parseInt(document.getElementById('goalAmountInput').value) || 1;
    if(totalAmount + price > goal){
        alert("목표 금액을 초과하여 더 이상 추가할 수 없습니다.");
        return;
    }

    createEmojiBody(name, price, emoji);
    
    totalAmount += price;
    updateGoal();

    const currentKeyring = appData.keyrings.find(k => k.id === appData.currentKeyringId);
    if(currentKeyring) {
        currentKeyring.items.push({ name, price, emoji});
        saveAllData();
    }

    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('emojiInput').value = '';
}

//이모티콘 추가하기
function createEmojiBody(name, price, emoji) {
    const isImage = emoji.startsWith('http://')  ||
                    emoji.startsWith('https://') ||
                    emoji.startsWith('data:image/');

    const x = Math.random() * 200 + 100;
    const y = -50;
    const radius = 25;

    const bodyOptions = {
        restitution: 0.5,
        friction: 0.1,
        isSensor: false,
        bullet: true,
        render: { }
    };

    if(isImage) {
        const img = new Image();
        
        img.onload = function() {
            const targetSize = 50;
            const maxDimension = Math.max(img.width, img.height);
            let scale = 0.1;

            if (maxDimension > 0) {
                scale = targetSize / maxDimension;
            }

            bodyOptions.render.sprite = {
                texture: emoji,
                xScale: scale,
                yScale: scale
            };

            const body = Bodies.circle(x, y, radius, bodyOptions);
            body.myData = { name, price, emoji };
            Composite.add(engine.world, body);
        };

        img.src = emoji;
    } else {
        bodyOptions.render.sprite = {
            texture: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='40'>${emoji}</text></svg>` 
            ,
            xScale: 1,
            yScale: 1
        };

        const body = Bodies.circle(x, y, 25, bodyOptions);
        body.myData = { name, price, emoji };
        Composite.add(engine.world, body);
    }
}

function updateGoal() {
    const goalAmount = parseInt(document.getElementById('goalAmountInput').value) || 10000;
    
    document.getElementById('current-amount').innerText = totalAmount;
    
    const percent = Math.min((totalAmount / goalAmount) * 100, 100);
    document.getElementById('progress-fill').style.width = percent + '%';
    
    const fill = document.getElementById('progress-fill');
    if (totalAmount >= goalAmount) {
        fill.style.background = 'linear-gradient(90deg, #ff9a9e, #fad0c4)'; 
    } else {
        fill.style.background = 'linear-gradient(90deg, #ffc1e3, #d1b3ff)';
    }

    const currentKeyring = appData.keyrings.find(k => k.id === appData.currentKeyringId);
    if(currentKeyring) {
        currentKeyring.goalAmount = goalAmount;
        saveAllData();
    }
}

//LocalStorage 저장 함수
function saveAllData() {
    localStorage.setItem('wishKeyringAppData', JSON.stringify(appData));
}

//스티커판 메뉴
function openStickerMenu(){
    renderStickerBoard();
    document.getElementById('sticker-menu-modal').style.display = 'flex';
}

function closeStickerMenu(){
    console.log("close");
    document.getElementById('sticker-menu-modal').style.display = 'none';
}

function renderStickerBoard() {
    const grid = document.getElementById('keyring-grid');
    grid.innerHTML = '';
    
    appData.keyrings.forEach(keyring => {
        const isCurrent = keyring.id === appData.currentKeyringId;

        const card = document.createElement('div');
        card.className = `sticker-card ${isCurrent ? 'active' : ''}`;

        const emojisPreview = keyring.items.map(i => {
            const val = i.emoji;
            const isImg = val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/');
            
            if (isImg) {
                return `<img src="${val}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 50%; vertical-align: middle; margin: 0 2px;">`;
            } else {
                return `<span style="font-size: 18px; margin: 0 2px;">${val}</span>`;
            }
        }).join('');

        card.innerHTML = `
            <button class="delete-keyring-btn" onclick="deleteKeyring('${keyring.id}', event)">×</button>

            <h4>${keyring.title}</h4>
            <p>목표: ${keyring.goalAmount.toLocaleString()}원</p>
            <div class="sticker-preview" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; min-height: 30px; align-items: center;">${emojisPreview || ' '}</div>
            <button onclick="switchKeyring('${keyring.id}')">${isCurrent ? '사용 중' : '불러오기'}</button>
        `;
        grid.appendChild(card);
    });
}

//새 키링 생성
function createNewKeyring() {
    const titleInput = document.getElementById('newKeyringTitle');
    const goalInput = document.getElementById('newKeyringGoal');

    const title = titleInput.value.trim();
    const goalAmount = parseInt(goalInput.value) || 10000;

    if(!title) {
        alert("키링 이름을 입력해주세요.");
        return;
    }

    const newKeyring = {
        id: 'keyring_' + crypto.randomUUID(),
        title: title,
        goalAmount: goalAmount,
        items: []
    };

    appData.keyrings.push(newKeyring);
    appData.currentKeyringId = newKeyring.id;
    saveAllData();

    titleInput.value = '';
    goalInput.value = '';

    renderStickerBoard();
    renderCurrentKeyring(newKeyring);
    closeStickerMenu();
}

function switchKeyring(id){
    appData.currentKeyringId = id;
    saveAllData();

    const keyring = appData.keyrings.find(k => k.id === id);
    if(keyring) {
        renderCurrentKeyring(keyring);
    }
    closeStickerMenu();
}

//LocalStorage 데이터 불러오기
function loadAllData() {
    const saved = localStorage.getItem('wishKeyringAppData');
    if(saved) {
        appData = JSON.parse(saved);
    }

    if(!appData.keyrings || appData.keyrings.length === 0) {
        const defaultId = 'keyring_' + crypto.randomUUID();
        appData.keyrings = [{
            id: defaultId,
            title: 'Wish Keyring',
            goalAmount: 10000,
            items: []
        }];
        appData.currentKeyringId = defaultId;
    }

    let currentKeyring = appData.keyrings.find(k=>k.id === appData.currentKeyringId);
    if(!currentKeyring) {
        currentKeyring = appData.keyrings[0];
        appData.currentKeyringId = currentKeyring.id;
    }

    renderCurrentKeyring(currentKeyring);
}

//현재 키링 정보 렌더링
function renderCurrentKeyring(keyring) {
    const titleInput = document.getElementById('current-keyring-title');
    if(titleInput) {
        titleInput.value = keyring.title;
    }

    document.getElementById('goalAmountInput').value = keyring.goalAmount;

    const bodiesToRemove = engine.world.bodies.filter(body => body.myData);
    Composite.remove(engine.world, bodiesToRemove);

    totalAmount = 0;
    keyring.items.forEach(item=> {
        createEmojiBody(item.name, item.price, item.emoji);
        totalAmount += item.price;
    });

    updateGoal();
}

//마우스 클릭 / 터치 이벤트
let clickStartTime = 0;
let clickStartPosition = { x: 0, y: 0 };

Matter.Events.on(mouseConstraint, 'mousedown', (event) => {
    clickStartTime = Date.now();
    clickStartPosition = { ...event.mouse.position };
});

Matter.Events.on(mouseConstraint, 'mouseup', (event) => {
    handleBodyClick(event.mouse.position);
});

function handleBodyClick(position) {
    const dx = position.x - clickStartPosition.x;
    const dy = position.y - clickStartPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 10) {
        const bodies = Composite.allBodies(engine.world);
        const found = Matter.Query.point(bodies, position);
        const clickedBody = found.find(b => b.myData);

        if (clickedBody) {
            selectedBody = clickedBody;
            document.getElementById('modalNameInput').value = selectedBody.myData.name;
            document.getElementById('modalPriceInput').value = selectedBody.myData.price;

            document.getElementById('infoModal').style.display = 'flex';
        }
    }
}

function updateBodyData() {
    const currentKeyring = appData.keyrings.find(k => k.id === appData.currentKeyringId);

    if(currentKeyring) {
        const newTitle = document.getElementById('current-keyring-title');

        if(newTitle){
            currentKeyring.title = newTitle.value.trim();
            renderStickerBoard();
            saveAllData();
        }
        
    }

    if(selectedBody && selectedBody.myData){
        const newName = document.getElementById('modalNameInput').value;
        const newPrice = document.getElementById('modalPriceInput').value;

        if(selectedBody.myData){
            selectedBody.myData.name = newName.trim();
            selectedBody.myData.price = newPrice.trim();
        }
    }
}

function deleteEmoji() {
    if(selectedBody) {
        totalAmount -= selectedBody.myData.price;
        Composite.remove(engine.world, selectedBody);
        updateGoal();
        closeModal();
    }
}

function deleteKeyring(id, event) {
    event.stopPropagation();

    if(!confirm("키링을 삭제하시겠습니까?")){
        return;
    }

    appData.keyrings = appData.keyrings.filter(k => k.id !== id);

    if(appData.currentKeyringId === id){
        if(appData.keyrings.length > 0){
            appData.currentKeyringId = appData.keyrings[0].id;
        } else {
            const defaultId = 'keyring_' + crypto.randomUUID();
            appData.keyrings.push({
                id: defaultId,
                title: 'Wish Keyring',
                goalAmount: 10000,
                items: []
            });
            appData.currentKeyringId = defaultId;
        }
    }

    saveAllData();
    renderStickerBoard();

    const currentKeyring = appData.keyrings.find(k => k.id === appData.currentKeyringId);
    if(currentKeyring) {
        renderCurrentKeyring(currentKeyring);
    }
}
function closeModal() { 
    document.getElementById('infoModal').style.display = 'none'; 
}

// 마우스 드래그 제한
Matter.Events.on(engine, 'beforeUpdate', function() {
    const mouse = mouseConstraint.mouse;
    const body = mouseConstraint.body;

    if (body) {
        const dx = body.position.x - 160;
        const dy = body.position.y - 160;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 140) {
            mouseConstraint.body = null;
            mouseConstraint.constraint.bodyB = null;
        }
    }
});

// 이모티콘 위치 제한
Matter.Events.on(engine, 'afterUpdate', () => {
    Composite.allBodies(engine.world).forEach(body => {
        if (!body.isStatic) {
            const dx = body.position.x - 160;
            const dy = body.position.y - 160;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 150) {
                Matter.Body.setPosition(body, { x: 160, y: 160 });
                Matter.Body.setVelocity(body, { x: 0, y: 0 });
            }
        }
    });
});

//엔터키 이벤트
window.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.input-container input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addEmoji();
            }
        });
    });
});

//휴대폰 기울기 이벤트
window.addEventListener('deviceorientation', (event) => {
    let tiltX = event.gamma || 0; 
    let tiltY = event.beta || 0;

    tiltX = Math.max(-45, Math.min(45, tiltX));
    tiltY = Math.max(-45, Math.min(45, tiltY));

    const offsetX = tiltX / 45;
    const offsetY = tiltY / 45;

    const hlX = 35 + (offsetX * 30);
    const hlY = 30 + (offsetY * 30);
    
    const angle = Math.atan2(offsetY, offsetX);
    const distance = Math.min(1, Math.hypot(offsetX, offsetY));

    const shadowX = (-Math.cos(angle) * distance * 20).toFixed(2);
    const shadowY = (-Math.sin(angle) * distance * 20).toFixed(2);
    const antiShadowX = (-shadowX * 0.6).toFixed(2);
    const antiShadowY = (-shadowY * 0.6).toFixed(2);

    const rotateX = (-offsetY * 12).toFixed(2);
    const rotateY = (offsetX * 12).toFixed(2);

    const keyringBox = document.getElementById('keyring-box');
    if (keyringBox) {
        keyringBox.style.backgroundImage = `radial-gradient(circle at 
            ${hlX.toFixed(2)}% ${hlY.toFixed(2)}%, 
            rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.35) 35%, rgba(255,255,255,0) 70%)
        `;
        keyringBox.style.boxShadow = `
            inset ${shadowX}px ${shadowY}px 30px rgba(0, 0, 0, 0.22),
            inset ${antiShadowX}px ${antiShadowY}px 15px rgba(255, 255, 255, 0.6),
            0 ${15 + offsetY * 8}px ${30 + Math.abs(offsetX)*8}px rgba(0, 0, 0, 0.18)
        `;

        keyringBox.style.transform = `perspective(1000px)
            rotateX(${rotateX}deg)
            rotateY(${rotateY}deg)
            scale(1.02)
        `;
    }

    if (typeof engine !== 'undefined' && engine) {
        engine.world.gravity.x = tiltX / 30;
        engine.world.gravity.y = tiltY / 30;
    }
});

// 마우스 기울기
document.addEventListener('mousemove', (e) => {
    const keyringBox = document.getElementById('keyring-box');
    if (!keyringBox) return;

    const rect = keyringBox.getBoundingClientRect();
    
    const x = (e.clientX / window.innerWidth) * 100;
    const y = (e.clientY / window.innerHeight) * 100;

    const boxCenterX = rect.left + rect.width / 2;
    const boxCenterY = rect.top + rect.height / 2;

    const maxRange = Math.max(rect.width, rect.height) * 1.5;

    const offsetX = Math.max(-1, Math.min(1, (e.clientX - boxCenterX) / maxRange));
    const offsetY = Math.max(-1, Math.min(1, (e.clientY - boxCenterY) /maxRange));

    const hlX = 35 + (offsetX * 30);
    const hlY = 30 + (offsetY * 30);
    
    const angle = Math.atan2(offsetY, offsetX);
    const distance = Math.min(1, Math.hypot(offsetX, offsetY));

    const shadowX = (-Math.cos(angle) * distance * 20).toFixed(2);
    const shadowY = (-Math.sin(angle) * distance * 20).toFixed(2);
    const antiShadowX = (-shadowX * 0.6).toFixed(2);
    const antiShadowY = (-shadowY * 0.6).toFixed(2);

    const isInside = e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom;
    
    const rotateX = (isInside ? -offsetY * 4 : -offsetY * 12).toFixed(2);
    const rotateY = (isInside ? offsetX * 4 : offsetX * 12).toFixed(2);
    const scale = isInside ? 1.01 : 1.02;

    keyringBox.style.backgroundImage = `radial-gradient(circle at 
        ${hlX.toFixed(2)}% 
        ${hlY.toFixed(2)}%
        , rgba(255,255,255,0.95) 0%
        , rgba(255,255,255,0.35) 35%
        , rgba(255,255,255,0) 70%)`;

    keyringBox.style.boxShadow = `
        inset ${shadowX}px ${shadowY}px 30px rgba(0, 0, 0, 0.22),
        inset ${antiShadowX}px ${antiShadowY}px 15px rgba(255, 255, 255, 0.6),
        0 ${15 + offsetY * 8}px ${30 + Math.abs(offsetX)*8}px rgba(0, 0, 0, 0.18)
    `;

    keyringBox.style.transform = `perspective(1000px) 
        rotateX(${rotateX}deg) 
        rotateY(${rotateY}deg) 
        scale(${scale})
    `;


});

function handleImagePaste(event) {
    const items = (event.clipboardData || event.originalEvent.clipboardData).items;
    
    for (let index in items) {
        const item = items[index];
        
        if (item.kind === 'file' && item.type.indexOf('image/') !== -1) {
            const blob = item.getAsFile();
            const reader = new FileReader();
            
            reader.onload = function (e) {
                const base64Data = e.target.result;
                document.getElementById('emojiInput').value = base64Data;
            };
            
            reader.readAsDataURL(blob);
            
            event.preventDefault();
            break;
        }
    }
}