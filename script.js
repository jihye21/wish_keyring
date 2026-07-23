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

const designs = [
    {
        id: "glass",
        name: "Glass"
    },
    {
        id: "pastel",
        name: "Pastel"
    },
    {
        id: "metal",
        name: "Metal"
    },
    {
        id:"wood",
        name: "wood"
    },
    {
        id:"neon",
        name: "Neon"
    }
];

const shapes = [
    { id: "default", name: "Square" },
    { id: "bear", name: "Bear" },
    { id: "cloud", name: "Cloud" }
];

let keyringRotation = {
    x:0,
    y:0,
    scale:1
};

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

    const itemId = 'item_' + crypto.randomUUID();
    createEmojiBody(name, price, emoji, itemId);
    
    totalAmount += price;
    updateGoal();

    const currentKeyring = appData.keyrings.find(k => k.id === appData.currentKeyringId);
    if(currentKeyring) {
        currentKeyring.items.push({ id: itemId, name, price, emoji});
        saveAllData();
    }

    document.getElementById('itemName').value = '';
    document.getElementById('itemPrice').value = '';
    document.getElementById('emojiInput').value = '';
}

//이모티콘 추가하기
function createEmojiBody(name, price, emoji, itemId) {
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
            body.myData = { id: itemId, name, price, emoji };
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
        body.myData = { id: itemId, name, price, emoji };
        Composite.add(engine.world, body);
    }
}

function updateGoal() {
    let goalAmount = parseInt(document.getElementById('goalAmountInput').value) || 10000;
    
    if (goalAmount < totalAmount) {
        goalAmount = totalAmount;
        document.getElementById('goalAmountInput').value = totalAmount;
    }

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

//디자인 메뉴
let editingDesignKeyringId = null;

function openDesignMenu(keyringId){
    editingDesignKeyringId = keyringId;

    renderDesignMenu();
    document.getElementById("design-menu-modal").style.display="flex";
}

function closeDesignMenu(){
    document.getElementById("design-menu-modal").style.display="none";
}

function renderDesignMenu(){

    const grid=document.getElementById("design-grid");

    grid.innerHTML="";

    designs.forEach(design=>{

        const card=document.createElement("div");

        card.className="design-card";

        card.innerHTML=`
            <div class="design-preview ${design.id}"></div>
            <p>${design.name}</p>
        `;

        card.onclick=()=>{

            const keyring = appData.keyrings.find(
                k => k.id === editingDesignKeyringId
            );

            keyring.design = design.id;

            if (keyring.id === appData.currentKeyringId) {
                applyKeyringDesign();
            }
            console.log(appData.keyrings);

            saveAllData();
            closeDesignMenu();
            renderStickerBoard();
        };

        grid.appendChild(card);

    });

}

//디자인 적용 함수
function getCurrentKeyring() {
    return appData.keyrings.find(
        keyring => keyring.id === appData.currentKeyringId
    );
}

function applyKeyringDesign(){
    const keyring = getCurrentKeyring();

    const box = document.getElementById("keyring-box");

    box.className = "";
    box.classList.add(keyring?.design || "glass");

    box.style.transform = `
        perspective(1000px)
        rotateX(${keyringRotation.x}deg)
        rotateY(${keyringRotation.y}deg)
        scale(${keyringRotation.scale})
    `;
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

        const items = keyring.items || [];
        
        const visibleItems = items.slice(0, 4);

        let emojisPreview = visibleItems.map(i => {
            const val = i.emoji;
            const isImg = val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/');
            
            if (isImg) {
                return `<img src="${val}" style="width: 24px; height: 24px; object-fit: cover; border-radius: 50%; vertical-align: middle; margin: 0 2px;">`;
            } else {
                return `<span style="font-size: 18px; margin: 0 2px;">${val}</span>`;
            }
        }).join('');

        if(items.length > 4){
            emojisPreview += `<span style="font-size: 12px; color: #888; margin-left: 2px;">+${items.length - 4}</span>`;        }

        card.innerHTML = `
            <button class="delete-keyring-btn" onclick="deleteKeyring('${keyring.id}', event)">×</button>

            <h4>${keyring.title}</h4>
            <p>목표: ${keyring.goalAmount.toLocaleString()}원</p>
            <div class="sticker-preview">${emojisPreview || ' '}</div>

            <div class="keyring-actions">
                <button onclick="switchKeyring('${keyring.id}')">${isCurrent ? '사용 중' : '불러오기'}</button>
                <button onclick="openDesignMenu('${keyring.id}')">
                🎨
                </button>
            </div>
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
        design: "glass",
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
    
    applyKeyringDesign();
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
            design: "glass",
            items: []
        }];
        appData.currentKeyringId = defaultId;
    }

    let currentKeyring = appData.keyrings.find(k=>k.id === appData.currentKeyringId);
    if(!currentKeyring) {
        currentKeyring = appData.keyrings[0];
        appData.currentKeyringId = currentKeyring.id;
    }

    if(!currentKeyring.design) {
        currentKeyring.design = "glass";
    }

    renderCurrentKeyring(currentKeyring);
    applyKeyringDesign();
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

        const currentKeyring = appData.keyrings.find(k=>k.id === appData.currentKeyringId);
        if(currentKeyring && currentKeyring.items){
            currentKeyring.items = currentKeyring.items.filter(item => item.id !== selectedBody.myData.id);
        }

        Composite.remove(engine.world, selectedBody);
        updateGoal();
        saveAllData();
        closeModal();
        selectedBody = null;
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
let sensorCount = 0;
const STABILIZE_THRESHOLD = 5;

function getScreenAngle(){
    if(window.screen && window.screen.orientation){
        return window.screen.orientation.angle;
    }
    return window.orientation || 0;
}

window.addEventListener('deviceorientation', (event) => {
    if(sensorCount < STABILIZE_THRESHOLD) {
        sensorCount++;
        return;
    }

    let beta = event.gamma || 0; 
    let gamma = event.beta || 0;

    const screenAngle = getScreenAngle();
    let adjustedBeta = beta;
    let adjustedGamma = gamma;

    if(screenAngle === 90) {
        adjustedBeta = - gamma;
        adjustedGamma = beta;
    } else if (screenAngle === -90 || screenAngle === 270) {
        adjustedBeta = gamma;
        adjustedGamma = -gamma;
    }

    const baseTilt = 45;
    let tiltX = adjustedBeta - baseTilt;
    let tiltY = adjustedGamma;

    tiltX = Math.max(-30, Math.min(30, tiltX));
    tiltY = Math.max(-30, Math.min(30, tiltY));

    const offsetX = tiltX / 30;
    const offsetY = tiltY / 30;

    const hlX = 35 + (offsetX * 30);
    const hlY = 30 + (offsetY * 30);
    const sideX = -offsetX * 20;
    const sideY = -offsetY * 20;
    
    const angle = Math.atan2(offsetY, offsetX);
    const distance = Math.min(1, Math.hypot(offsetX, offsetY));

    const shadowX = (-Math.cos(angle) * distance * 20).toFixed(2);
    const shadowY = (-Math.sin(angle) * distance * 20).toFixed(2);
    const antiShadowX = (-shadowX * 0.6).toFixed(2);
    const antiShadowY = (-shadowY * 0.6).toFixed(2);

    keyringRotation.x = (-offsetY * 15).toFixed(2);
    keyringRotation.y = (offsetX * 15).toFixed(2);

    const tiltAmount = Math.min(
        1,
        Math.hypot(offsetX, offsetY)
    );

    keyringRotation.scale =
        (1 + tiltAmount * 0.015).toFixed(3);


    const keyringBox = document.getElementById('keyring-box');
    if(!keyringBox) return;

        const style =
        getComputedStyle(keyringBox);

        const highlightColor =
            style.getPropertyValue('--highlight-color').trim()
            || "rgba(255,255,255,.95)";

        const highlightSoft =
            style.getPropertyValue('--highlight-soft').trim()
            || "rgba(255,255,255,.35)";

        const shadowColor =
            style.getPropertyValue('--shadow-color').trim()
            || "rgba(0,0,0,.22)";

        const shadowLight =
            style.getPropertyValue('--shadow-light').trim()
            || "rgba(255,255,255,.6)";

        const highlight =
            document.getElementById(
                "keyring-highlight"
            );

        if(highlight){

            highlight.style.backgroundImage = `
                radial-gradient(
                    circle at
                    ${hlX}%
                    ${hlY}%,
                    ${highlightColor},
                    ${highlightSoft} 35%,
                    transparent 70%
                )
            `;
        }

        const shadowLayer =
            document.getElementById(
                "keyring-shadow"
            );

        if(shadowLayer){

            shadowLayer.style.boxShadow = `

                inset ${shadowX}px ${shadowY}px 30px
                ${shadowColor},

                inset ${antiShadowX}px ${antiShadowY}px 15px
                ${shadowLight}

            `;
        }

        const side =
            document.getElementById(
                "keyring-side"
            );

        if(side){
            const moveX = (sideX * 0.3).toFixed(2);
            const moveY = (sideY * 0.3).toFixed(2);

            const edgeColor =
                style.getPropertyValue('--edge-color')
                || "rgba(0,0,0,.25)";


            side.style.background = `
                radial-gradient(
                    circle at
                    ${moveX}%
                    ${moveY}%,
                    transparent 40%,
                    ${edgeColor} 100%
                )
            `;
        }

        keyringBox.style.transform = `
            perspective(1000px)
            rotateX(${keyringRotation.x}deg)
            rotateY(${keyringRotation.y}deg)
            scale(${keyringRotation.scale})
        `;

        if(typeof engine !== 'undefined' && engine){

            engine.world.gravity.x =
                tiltX / 30;

            engine.world.gravity.y =
                tiltY / 30;
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
    const sideX = -offsetX * 20;
    const sideY = -offsetY * 20;

    
    const angle = Math.atan2(offsetY, offsetX);
    const distance = Math.min(1, Math.hypot(offsetX, offsetY));

    const shadowX = (-Math.cos(angle) * distance * 20).toFixed(2);
    const shadowY = (-Math.sin(angle) * distance * 20).toFixed(2);
    const antiShadowX = (-shadowX * 0.6).toFixed(2);
    const antiShadowY = (-shadowY * 0.6).toFixed(2);

    const isInside = e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom;
    
    keyringRotation.x = (isInside ? -offsetY * 15 : -offsetY * 20).toFixed(2);
    keyringRotation.y = (isInside ? offsetX * 15 : offsetX * 20).toFixed(2);
    const tiltAmount = Math.min(
        1,
        Math.hypot(offsetX, offsetY)
    );

    keyringRotation.scale =
        (1 + tiltAmount * 0.015).toFixed(3);

    const style = getComputedStyle(keyringBox);

    const highlightColor =
        style.getPropertyValue('--highlight-color').trim()
        || "rgba(255,255,255,.95)";

    const highlightSoft =
        style.getPropertyValue('--highlight-soft').trim()
        || "rgba(255,255,255,.35)";

    const shadowColor =
        style.getPropertyValue('--shadow-color').trim()
        || "rgba(0,0,0,.22)";

    const shadowLight =
        style.getPropertyValue('--shadow-light').trim()
        || "rgba(255,255,255,.6)";

    const highlight = document.getElementById("keyring-highlight");

    if(highlight){
        highlight.style.backgroundImage = `
            radial-gradient(
                circle at 
                ${hlX}%
                ${hlY}%,
                ${highlightColor},
                ${highlightSoft} 35%,
                transparent 70%
            )
        `;
    }

    const shadowLayer =
        document.getElementById("keyring-shadow");

    if(shadowColor){
        shadowLayer.style.boxShadow = `

            inset ${shadowX}px ${shadowY}px 30px
            ${shadowColor},

            inset ${antiShadowX}px ${antiShadowY}px 15px
            ${shadowLight}

        `;
    }

    const side =
        document.getElementById(
            "keyring-side"
        );

    if(side){
        const moveX = (sideX * 0.3).toFixed(2);
        const moveY = (sideY * 0.3).toFixed(2);

        const edgeColor =
            style.getPropertyValue('--edge-color')
            || "rgba(0,0,0,.25)";


        side.style.background = `
            radial-gradient(
                circle at
                ${moveX}%
                ${moveY}%,
                transparent 40%,
                ${edgeColor} 100%
            )
        `;
    }

    keyringBox.style.transform = `perspective(1000px) 
        rotateX(${keyringRotation.x}deg) 
        rotateY(${keyringRotation.y}deg) 
        scale(${keyringRotation.scale})
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