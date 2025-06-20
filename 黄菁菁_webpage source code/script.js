// 游戏状态
const GAME_CONFIG = {
    maxHP: 12,
    currentPage: 1
};

// 攻击配置
const ATTACK_CONFIG = {
    smile: { damage: 2.0, cooldown: 400 },  // 微笑攻击冷却时间缩短到0.4秒
    wave: { damage: 1.0, cooldown: 300 },   // 挥手攻击冷却时间缩短到0.3秒
    click: { damage: 2.0, cooldown: 200 }   // 点击攻击冷却时间缩短到0.2秒
};

// 检测配置
const DETECTION_CONFIG = {
    SMILE_THRESHOLD: 0.1,
    HAND_DETECTION_INTERVAL: 200,
    FRAME_RATE: 30,
    WAVE_THRESHOLD: 8,     // 大幅降低挥手判定阈值，更容易触发
    PALM_WIDTH_THRESHOLD: 30  // 大幅降低手掌宽度阈值，更容易触发
};

// 移除未使用的PERFORMANCE_CONFIG，这些配置在简化版本中不需要

// 语音识别状态
let recognition = null;
let isListening = false;

// 状态变量
let monster = { hp: GAME_CONFIG.maxHP };
let currentWeapon = 'wave';
let handDetectionActive = false;
let isDetectingSmile = false;
let isDetectingHands = false;
let isSmiling = false;
// 移除复杂的状态管理，使用简化的检测逻辑

// 按照用户要求定义全局变量
let video = null;               // 摄像头视频元素
let faceMesh = null;            // FaceMesh模型
let hands = null;               // MediaPipe手部检测实例
let handGestureState = false;   // 手势状态，避免重复触发

// 创建一个简化的手部检测初始化函数
let handDetectionInitialized = false;

async function initHandDetectionOnce() {
    if (handDetectionInitialized) {
        console.log('✅ 手部检测已经初始化，跳过重复初始化');
        return true;
    }
    
    try {
        console.log('🔄 开始初始化手部检测（单次）...');
        
        // 创建 Hands 实例
        hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`;
            }
        });
        console.log('✅ Hands实例创建成功');
        
        // 配置参数
        await hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 0,
            minDetectionConfidence: 0.3,
            minTrackingConfidence: 0.3
        });
        console.log('✅ 手部检测参数配置完成');
        
        // 绑定回调函数 - 只绑定一次
        hands.onResults((results) => {
            console.log('🔥 收到 MediaPipe 回调！检测到手部数量:', results.multiHandLandmarks?.length || 0);
            onHandsResults(results);
        });
        console.log('✅ 手部检测回调绑定完成');
        
        handDetectionInitialized = true;
        return true;
        
    } catch (error) {
        console.error('❌ 手部检测初始化失败:', error);
        return false;
    }
}

// 简化的手部检测启动函数
async function startHandDetectionSimple() {
    try {
        console.log('🚀 启动简化版手部检测...');
        
        // 确保只初始化一次
        const initialized = await initHandDetectionOnce();
        if (!initialized) {
            console.error('❌ 手部检测初始化失败');
            return false;
        }
        
        if (!video || !hands) {
            console.error('❌ 视频或hands实例不存在');
            return false;
        }
        
        // 设置检测状态
        handDetectionActive = true;
        console.log('✅ 手部检测状态已激活');
        
        // 开始简单的帧处理循环
        let frameCount = 0;
        const processFrame = async () => {
            try {
                if (!handDetectionActive || !hands || !video || video.paused || video.ended) {
                    console.log('❌ 检测条件不满足，停止处理');
                    return;
                }
                
                frameCount++;
                
                // 发送视频帧
                await hands.send({image: video});
                
                // 每30帧输出一次状态
                if (frameCount % 30 === 0) {
                    console.log(`📊 已处理${frameCount}帧`);
                    console.log(`📊 视频状态: ${video.videoWidth}x${video.videoHeight}, readyState: ${video.readyState}`);
                }
                
                // 继续下一帧（降低帧率）
                if (handDetectionActive) {
                    setTimeout(() => processFrame(), 100); // 100ms间隔，约10fps
                }
                
            } catch (error) {
                console.error('❌ 处理帧失败:', error);
                // 继续处理下一帧
                if (handDetectionActive) {
                    setTimeout(() => processFrame(), 500);
                }
            }
        };
        
        // 开始处理
        console.log('🎬 开始手部检测循环');
        processFrame();
        
        return true;
        
    } catch (error) {
        console.error('❌ 启动手部检测失败:', error);
        return false;
    }
}

// 检测相关变量
let lastSmileTime = 0;
let lastHandDetectionTime = 0;
let lastWristY = null;
let lastWristX = null;
let initialMouthDistance = null;

// 模型缓存 - 避免重复初始化  
let modelCache = {
    hands: null,
    faceMesh: null,
    isHandsInitialized: false,
    isFaceMeshInitialized: false
};

// 创建离屏Canvas
const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });

// 移除未使用的性能监控变量

// 音效管理
let clickSound = null;
let typeSound = null;
let backgroundMusic = null;

// 初始化音效
function initSound() {
    try {
        clickSound = new Audio('./sounds/xm3415.mp3');
        clickSound.preload = 'auto';
        clickSound.volume = 0.5; // 设置音量为50%
        console.log('按钮点击音效已加载');
        
        typeSound = new Audio('./sounds/type.mp3');
        typeSound.preload = 'auto';
        typeSound.volume = 0.3; // 设置音量为30%，避免过于突兀
        typeSound.loop = true; // 循环播放
        console.log('打字机音效已加载');
        
        backgroundMusic = new Audio('./sounds/music.mp3');
        backgroundMusic.preload = 'auto';
        backgroundMusic.volume = 0.2; // 设置音量为20%，作为背景音乐不会太突兀
        backgroundMusic.loop = true; // 循环播放
        console.log('背景音乐已加载');
    } catch (error) {
        console.warn('音效加载失败:', error);
    }
}

// 播放按钮点击音效
function playClickSound() {
    try {
        if (clickSound) {
            clickSound.currentTime = 0; // 重置播放位置
            clickSound.play().catch(error => {
                console.warn('音效播放失败:', error);
            });
        }
    } catch (error) {
        console.warn('播放音效时出错:', error);
    }
}

// 开始播放打字机音效
function startTypeSound() {
    try {
        if (typeSound) {
            typeSound.currentTime = 0; // 重置播放位置
            typeSound.play().catch(error => {
                console.warn('打字机音效播放失败:', error);
            });
        }
    } catch (error) {
        console.warn('播放打字机音效时出错:', error);
    }
}

// 停止播放打字机音效
function stopTypeSound() {
    try {
        if (typeSound && !typeSound.paused) {
            typeSound.pause();
            typeSound.currentTime = 0; // 重置播放位置
        }
    } catch (error) {
        console.warn('停止打字机音效时出错:', error);
    }
}

// 开始播放背景音乐
function startBackgroundMusic() {
    try {
        if (backgroundMusic) {
            backgroundMusic.play().catch(error => {
                console.warn('背景音乐播放失败:', error);
                // 如果自动播放失败，等待用户交互后再尝试播放
                document.addEventListener('click', () => {
                    if (backgroundMusic.paused) {
                        backgroundMusic.play().catch(err => {
                            console.warn('用户交互后背景音乐播放仍失败:', err);
                        });
                    }
                }, { once: true });
            });
            console.log('背景音乐开始播放');
        }
    } catch (error) {
        console.warn('播放背景音乐时出错:', error);
    }
}

// 停止播放背景音乐
function stopBackgroundMusic() {
    try {
        if (backgroundMusic && !backgroundMusic.paused) {
            backgroundMusic.pause();
            console.log('背景音乐已停止');
        }
    } catch (error) {
        console.warn('停止背景音乐时出错:', error);
    }
}

// 为所有按钮添加点击音效
function addClickSoundToAllButtons() {
    // 获取所有按钮元素（包括HTML中的各种按钮类型）
    const allButtons = document.querySelectorAll('button, .cartoon-btn, .retro-btn, .start-experience-btn, .transition-continue-btn');
    
    allButtons.forEach(button => {
        // 为每个按钮添加点击事件监听器
        button.addEventListener('click', () => {
            playClickSound();
        }, { passive: true });
    });
    
    // 特别处理一些可能动态创建的按钮和点击事件
    document.addEventListener('click', (event) => {
        const target = event.target;
        // 检查点击的元素是否是按钮或具有按钮样式的元素
        if (target.tagName === 'BUTTON' || 
            target.classList.contains('cartoon-btn') || 
            target.classList.contains('retro-btn') ||
            target.classList.contains('start-experience-btn') ||
            target.classList.contains('transition-continue-btn') ||
            target.classList.contains('button') ||
            target.classList.contains('btn') ||
            target.id === 'next-page' ||
            target.id === 'startButton' ||
            // 检查父元素是否是按钮容器
            target.parentElement?.classList.contains('start-experience-btn')) {
            playClickSound();
        }
    }, { passive: true });
    
    console.log('已为所有按钮添加点击音效');
}

// 持续检测辅助函数
function updateContinuousDetection(type, detected) {
    const state = continuousDetectionState[type];
    if (!state) return false;
    
    if (detected) {
        // 检测到目标动作
        state.detectionCount++;
        console.log(`🔄 ${type}持续检测: ${state.detectionCount}/${state.requiredCount}`);
        
        // 清除重置计时器
        if (state.resetTimer) {
            clearTimeout(state.resetTimer);
            state.resetTimer = null;
        }
        
        // 检查是否达到要求次数
        if (state.detectionCount >= state.requiredCount) {
            console.log(`✅ ${type}持续检测成功！`);
            state.detectionCount = 0;
            state.isActive = false;
            return true; // 触发攻击
        }
        
        // 设置重置计时器（2秒内没有新检测就重置）
        state.resetTimer = setTimeout(() => {
            console.log(`⏰ ${type}持续检测超时重置`);
            state.detectionCount = 0;
            state.isActive = false;
        }, 2000);
        
    } else if (state.isActive) {
        // 没有检测到，但检测状态是活跃的，开始重置计时器
        if (!state.resetTimer) {
            state.resetTimer = setTimeout(() => {
                console.log(`❌ ${type}持续检测中断重置`);
                state.detectionCount = 0;
                state.isActive = false;
            }, 1200); // 增加延迟，减少频繁重置
        }
    }
    
    return false;
}

// 开始持续检测
function startContinuousDetection(type) {
    const state = continuousDetectionState[type];
    if (state) {
        state.isActive = true;
        state.detectionCount = 0;
        if (state.resetTimer) {
            clearTimeout(state.resetTimer);
            state.resetTimer = null;
        }
        console.log(`🎯 开始${type}持续检测模式`);
    }
}

// 移除未使用的updatePerformanceStats函数

// 添加性能调试函数
window.checkPerformance = function() {
    console.log('🔍 当前性能状态:');
    console.log(`- 手部检测: ${handDetectionActive ? '✅ 活动' : '❌ 非活动'}`);
    console.log(`- 微笑检测: ${isDetectingSmile ? '✅ 活动' : '❌ 非活动'}`);
    console.log(`- 当前武器: ${currentWeapon}`);
    console.log(`- 视频状态: ${video ? (video.readyState >= 2 ? '✅ 就绪' : '⏳ 加载中') : '❌ 未找到'}`);
    console.log(`- 手部模型: ${hands ? '✅ 已加载' : '❌ 未加载'}`);
    console.log(`- 面部模型: ${faceMesh ? '✅ 已加载' : '❌ 未加载'}`);
    console.log('🎮 配置参数:');
            console.log('- 简化版手部检测已启用');
};

// 怪物视频文件列表
const monsterVideos = [
    'monster/1.mp4',
    'monster/2.mp4',
    'monster/3.mp4',
    'monster/4.mp4',
    'monster/5.mp4'
];

// 视频背景控制
let backgroundVideo = null;

// 初始化视频背景
function initBackgroundVideo() {
    backgroundVideo = document.getElementById('backgroundVideo');
    if (backgroundVideo) {
        console.log('初始化背景视频');
        
        // 立即尝试播放视频
        const playVideo = () => {
            backgroundVideo.play().catch(error => {
                console.warn('背景视频自动播放被阻止:', error);
                // 如果自动播放失败，尝试静音播放
                backgroundVideo.muted = true;
                backgroundVideo.play().catch(err => {
                    console.error('背景视频播放失败:', err);
                });
            });
        };
        
        // 如果视频已经加载，立即播放
        if (backgroundVideo.readyState >= 2) {
            playVideo();
        } else {
            // 等待视频加载完成后播放
            backgroundVideo.addEventListener('loadeddata', playVideo, { once: true });
        }

        // 处理视频播放错误
        backgroundVideo.addEventListener('error', (error) => {
            console.error('背景视频加载失败:', error);
        });

        // 确保视频循环播放
        backgroundVideo.addEventListener('ended', () => {
            backgroundVideo.currentTime = 0;
            backgroundVideo.play().catch(error => {
                console.warn('背景视频循环播放失败:', error);
            });
        });

        // 设置视频播放速率
        backgroundVideo.playbackRate = 0.75; // 降低播放速度以减少资源占用
        
        // 确保视频静音（避免自动播放限制）
        backgroundVideo.muted = true;
        
        // 预加载视频
        backgroundVideo.load();
    } else {
        console.error('找不到背景视频元素');
    }
}

// 开场视频控制
let coversheetVideo = null;
let openingVideoContainer = null;

// 开始体验函数
function startExperience() {
    console.log('开始体验按钮被点击');
    
    // 确保背景音乐开始播放（用户交互后可以播放音频）
    if (backgroundMusic && backgroundMusic.paused) {
        startBackgroundMusic();
    }
    
    // 隐藏开始按钮
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.style.display = 'none';
    }
    
    // 显示并播放视频
    const coversheetVideo = document.getElementById('coversheetVideo');
    if (coversheetVideo) {
        coversheetVideo.style.display = 'block';
        
        // 尝试播放视频
        const playPromise = coversheetVideo.play();
        
        if (playPromise !== undefined) {
            playPromise.then(() => {
                console.log('视频开始播放');
            }).catch(error => {
                console.error('视频播放失败:', error);
                // 显示播放按钮
                const clickToContinue = document.querySelector('.click-to-continue');
                if (clickToContinue) {
                    clickToContinue.textContent = '点击播放';
                    clickToContinue.style.display = 'block';
                }
            });
        }
    }
}

// 初始化开场视频
function initOpeningVideo() {
    coversheetVideo = document.getElementById('coversheetVideo');
    openingVideoContainer = document.getElementById('openingVideo');
    
    if (coversheetVideo && openingVideoContainer) {
        console.log('开始初始化开场视频...');
        
        // 立即预加载背景视频
        const backgroundVideo = document.getElementById('backgroundVideo');
        if (backgroundVideo) {
            console.log('预加载背景视频');
            backgroundVideo.muted = true;
            backgroundVideo.load();
            // 预先准备播放
            backgroundVideo.addEventListener('loadeddata', () => {
                console.log('背景视频预加载完成');
            }, { once: true });
        }
        
        // 添加active类以隐藏其他内容
        openingVideoContainer.classList.add('active');
        
        // 确保视频加载但不自动播放，显示为静态背景
        coversheetVideo.load();
        coversheetVideo.style.display = 'block'; // 显示视频作为背景
        
        // 设置视频播放速率
        coversheetVideo.playbackRate = 0.75; // 降低播放速度以减少资源占用
        
        // 创建文字容器
        const textContainer = document.createElement('div');
        textContainer.className = 'opening-text-container';
        textContainer.style.cssText = `
            position: absolute;
            bottom: 20%;
            left: 50%;
            transform: translateX(-50%);
            width: 80%;
            max-width: 600px;
            color: white;
            font-family: 'HYPixel', sans-serif;
            font-size: 1.2rem;
            line-height: 1.8;
            text-align: center;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
            z-index: 11;
            opacity: 0;
            transition: opacity 0.5s ease-in-out;
        `;
        openingVideoContainer.appendChild(textContainer);
        
        // 定义要显示的文字段落
        const textSegments = [
            "你有没有这样的时刻 ——",
            "好像什么都没做错，却总觉得心里堵着点什么。",
            "一种莫名的焦虑，慢慢占据了你的脑海。",
            "它像个小怪物，",
            "藏在你的作业里、朋友圈里、甚至是凌晨三点的天花板上。",
            "它说你不够好，它说你在落后，它说你撑不住了。",
            "但今天，你可以试着把这些焦虑，说出来。",
            "我们会帮你，把它变成一只\"焦虑怪物\"。",
            "然后你——亲手，把它打败。",
            "焦虑不再是你的敌人，",
            "而是你理解自己的一把钥匙。",
            "释放它，战胜它，然后，继续前进。"
        ];
        
        // 打字动画函数
        function typeWriter(text, element, speed = 30) {
            return new Promise((resolve) => {
                let index = 0;
                element.textContent = '';
                
                // 开始打字时播放音效
                startTypeSound();
                
                function type() {
                    if (index < text.length) {
                        element.textContent += text[index];
                        index++;
                        setTimeout(type, speed);
                    } else {
                        // 打字结束时停止音效
                        stopTypeSound();
                        resolve();
                    }
                }
                
                type();
            });
        }
        
        // 显示文字段落的函数
        async function showTextSegments() {
            textContainer.style.opacity = '1';
            
            for (let i = 0; i < textSegments.length; i++) {
                const segment = textSegments[i];
                
                // 创建段落元素
                const p = document.createElement('p');
                p.style.cssText = `
                    margin: 0.8rem 0;
                    opacity: 0;
                    transform: translateY(10px);
                    transition: all 0.5s ease-in-out;
                `;
                textContainer.appendChild(p);
                
                // 段落淡入
                setTimeout(() => {
                    p.style.opacity = '1';
                    p.style.transform = 'translateY(0)';
                }, 100);
                
                // 打字效果
                await typeWriter(segment, p, 30);
                
                // 段落间停顿
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        }
        
        // 视频播放事件监听（只有在用户点击开始体验后才会触发）
        coversheetVideo.addEventListener('play', () => {
            console.log('视频开始播放');
            
            // 创建图片元素（只在视频播放时创建）
            const chartImage = document.createElement('img');
            chartImage.src = 'images/chart.png';
            chartImage.className = 'chart-overlay';
            chartImage.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                max-width: 80%;
                max-height: 80%;
                opacity: 0;
                transition: opacity 0.5s ease-in-out;
                z-index: 10;
            `;
            openingVideoContainer.appendChild(chartImage);
            
            // 2秒后显示图片和文字
            setTimeout(() => {
                console.log('显示图片和文字');
                chartImage.style.opacity = '1';
                showTextSegments();
            }, 2000);
        });

        // 视频播放结束时的处理
        coversheetVideo.addEventListener('ended', () => {
            console.log('开场视频播放结束');
            // 显示"点击继续"提示
            const clickToContinue = document.querySelector('.click-to-continue');
            if (clickToContinue) {
                clickToContinue.textContent = '点击继续';
                clickToContinue.style.display = 'block';
            }
        });

        // 点击事件处理
        openingVideoContainer.addEventListener('click', () => {
            console.log('点击开场视频容器');
            
            // 如果视频还没播放完
            if (!coversheetVideo.ended) {
                // 如果视频暂停了，继续播放
                if (coversheetVideo.paused) {
                    console.log('继续播放视频');
                    coversheetVideo.play();
                }
                return;
            }
            
            // 视频播放完成后，直接跳转到主界面
            console.log('跳转到主界面');
            
            // 立即移除开场视频
            openingVideoContainer.remove();
            
            // 初始化主界面
            initMainInterface();
        });

        // 处理视频加载错误
        coversheetVideo.addEventListener('error', (error) => {
            console.error('开场视频加载失败:', error);
            // 如果视频加载失败，直接进入主界面
            openingVideoContainer.remove();
            initMainInterface();
        });

        // 添加视频播放状态监听
        coversheetVideo.addEventListener('playing', () => {
            console.log('视频开始播放');
        });

        coversheetVideo.addEventListener('pause', () => {
            console.log('视频暂停');
        });

        coversheetVideo.addEventListener('waiting', () => {
            console.log('视频缓冲中');
        });
    } else {
        console.error('未找到开场视频元素');
    }
}

// 初始化主界面
function initMainInterface() {
    // 立即初始化视频背景
    initBackgroundVideo();
    
    // 确保所有页面初始状态正确
    document.querySelectorAll('.page').forEach(page => {
        page.style.display = 'none';
        page.classList.remove('show');
    });
    
    // 立即显示第一页，不使用延迟
    const page1 = document.getElementById('page1');
    if (page1) {
        page1.style.display = 'block';
        // 强制重绘
        page1.offsetHeight;
        // 添加显示类触发动画
        page1.classList.add('show');
        currentPage = 1;
        console.log('第一页已显示');
    } else {
        console.error('找不到第一页元素');
    }
    
    // 初始化其他功能
    initEventListeners();
    
    // 初始化语音识别
    initSpeechRecognition();
    
    // 异步初始化其他功能
    setTimeout(async () => {
        // 初始化机器学习库
        const mlInitialized = await initML();
        if (!mlInitialized) {
            console.warn('机器学习库初始化失败，部分功能可能不可用');
        }
        
        // 不在这里初始化摄像头，留到第三页时再初始化
        // await startCamera();
    }, 500);
}

// 修改页面加载事件
document.addEventListener('DOMContentLoaded', () => {
    // 初始化开场视频
    initOpeningVideo();
    
    // 初始化音效
    initSound();
    
    // 为所有按钮添加点击音效
    addClickSoundToAllButtons();
    
    // 延迟一秒后开始播放背景音乐，避免与页面加载冲突
    setTimeout(() => {
        startBackgroundMusic();
    }, 1000);
});

// 处理视频背景透明化
function processVideoFrame(videoElement) {
    // 检查视频是否已准备好
    if (!videoElement || videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        console.log('视频尚未准备好，跳过帧处理');
        return;
    }

    // 确保 offscreenCanvas 存在
    if (!offscreenCanvas) {
        offscreenCanvas = document.createElement('canvas');
        offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
    }

    // 设置 Canvas 尺寸
    offscreenCanvas.width = videoElement.videoWidth;
    offscreenCanvas.height = videoElement.videoHeight;
    
    // 绘制当前视频帧
    offscreenCtx.drawImage(videoElement, 0, 0);
    
    try {
        // 获取图像数据
        const imageData = offscreenCtx.getImageData(0, 0, offscreenCanvas.width, offscreenCanvas.height);
        const data = imageData.data;
        
        // 处理每个像素
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // 检测背景色（这里假设背景是白色或浅色）
            if (r > 240 && g > 240 && b > 240) {
                // 将背景像素设为透明
                data[i + 3] = 0;
            }
        }
        
        // 将处理后的图像数据放回Canvas
        offscreenCtx.putImageData(imageData, 0, 0);
        
        // 将处理后的帧绘制到显示Canvas
        const displayCanvas = document.getElementById('monsterCanvas');
        if (displayCanvas) {
            const ctx = displayCanvas.getContext('2d');
            ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
            ctx.drawImage(offscreenCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
        }
    } catch (error) {
        if (error.name === 'SecurityError') {
            console.warn('检测到跨域限制，使用简化显示模式');
            // 使用简化模式：直接显示视频而不进行像素处理
            const displayCanvas = document.getElementById('monsterCanvas');
            if (displayCanvas) {
                const ctx = displayCanvas.getContext('2d');
                ctx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
                // 直接绘制视频帧，不进行像素级处理
                ctx.drawImage(videoElement, 0, 0, displayCanvas.width, displayCanvas.height);
            }
        } else {
            console.error('处理视频帧时发生错误:', error);
        }
    }
}

// 修改setRandomMonsterVideo函数
function setRandomMonsterVideo() {
    console.log('开始设置怪兽视频...');
    
    const video = document.getElementById('monsterVideo');
    if (!video) {
        console.error('找不到monsterVideo元素');
        return;
    }
    
    try {
        const randomIndex = Math.floor(Math.random() * monsterVideos.length);
        const selectedVideo = monsterVideos[randomIndex];
        console.log('选择的视频文件:', selectedVideo);
        
        // 设置视频源并添加crossorigin属性
        video.crossOrigin = 'anonymous'; // 必须在设置src之前
        video.src = selectedVideo;
        video.style.display = 'none'; // 隐藏原始视频
        
        // 创建Canvas元素（如果不存在）
        let canvas = document.getElementById('monsterCanvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'monsterCanvas';
            canvas.width = 160;
            canvas.height = 160;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            video.parentNode.insertBefore(canvas, video);
        }
        
        // 添加视频加载事件监听
        video.onloadeddata = () => {
            console.log('视频加载成功，准备播放');
            video.play().then(() => {
                console.log('视频开始播放');
                // 开始处理视频帧
                function processFrame() {
                    if (video && !video.paused && !video.ended) {
                        processVideoFrame(video);
                        // 完全使用setTimeout，避免requestAnimationFrame
                        setTimeout(() => processFrame(), 300); // 进一步增加延迟，减少CPU占用
                    }
                }
                processFrame();
            }).catch(err => {
                console.error('视频播放失败:', err);
            });
        };
        
        video.onerror = () => {
            console.error('视频加载失败:', {
                error: video.error,
                networkState: video.networkState,
                readyState: video.readyState
            });
            // 如果视频加载失败，尝试回退到简单显示模式
            fallbackToSimpleDisplay(video);
        };
        
        // 确保视频容器可见
        const monsterDiv = document.getElementById('monster');
        if (monsterDiv) {
            monsterDiv.style.display = 'block';
        }
        
    } catch (error) {
        console.error('设置视频时发生错误:', error);
    }
}

// 添加回退显示函数
function fallbackToSimpleDisplay(video) {
    console.log('使用简单显示模式');
    const canvas = document.getElementById('monsterCanvas');
    if (canvas && video) {
        // 隐藏canvas，直接显示视频
        canvas.style.display = 'none';
        video.style.display = 'block';
        video.style.width = '160px';
        video.style.height = '160px';
        video.style.objectFit = 'cover';
        video.style.borderRadius = '8px';
    }
}

// 修改initML函数
async function initML() {
    try {
        // 设置 TensorFlow.js 后端
        await tf.setBackend('webgl');
        
        // 等待后端初始化完成
        await tf.ready();
        console.log('TensorFlow.js 后端已初始化');
        
        // 初始化 ml5.js
        console.log('ml5.js 版本:', ml5.version);
        
        return true;
    } catch (error) {
        console.error('初始化失败:', error);
        return false;
    }
}

// 页面切换函数
async function showPage(pageNumber) {
    // 页面切换时，停止所有检测以避免资源冲突
    if (pageNumber !== 3) {
        await stopAllDetections();
    }
    
    // 先隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('show');
        setTimeout(() => {
            page.style.display = 'none';
        }, 250);
    });
    
    // 短暂延迟后显示目标页面
    setTimeout(() => {
        const targetPage = document.getElementById('page' + pageNumber);
        if (targetPage) {
            targetPage.style.display = 'block';
            // 强制重绘
            targetPage.offsetHeight;
            // 添加显示类触发动画
            targetPage.classList.add('show');
            currentPage = pageNumber;
            
            // 如果切换到战斗页面，等待页面显示后再设置视频
            if (pageNumber === 3) {
                setTimeout(() => {
                    const video = document.getElementById('monsterVideo');
                    if (video) {
                        setRandomMonsterVideo();
                    } else {
                        console.error('找不到monsterVideo元素 (showPage)');
                    }
                }, 300);
            }
        } else {
            console.error('找不到目标页面:', pageNumber);
        }
    }, 250);
}

// 初始化语音识别
function initSpeechRecognition() {
    // 检查浏览器是否支持语音识别
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        console.warn('您的浏览器不支持语音识别功能，请使用Chrome浏览器。');
        return;
    }

    // 创建语音识别对象
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    // 配置语音识别
    recognition.lang = 'zh-CN'; // 设置语言为中文
    recognition.continuous = false; // 不持续识别
    recognition.interimResults = false; // 不返回临时结果
    
    // 识别结果处理
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript;
        document.getElementById('anxietyInput').value = transcript;
        console.log('识别结果:', transcript);
    };
    
    // 错误处理
    recognition.onerror = function(event) {
        console.error('语音识别错误:', event.error);
        if (event.error === 'no-speech') {
            alert('没有检测到语音，请重试。');
        } else if (event.error === 'audio-capture') {
            alert('无法访问麦克风，请确保已授予权限。');
        } else if (event.error === 'not-allowed') {
            alert('请允许使用麦克风。');
        } else {
            alert('语音识别出错，请重试。');
        }
    };
    
    // 识别结束处理
    recognition.onend = function() {
        console.log('语音识别结束');
        isListening = false;
    };
}

// 显示输入界面
function showInput() {
    // 隐藏首页
    document.getElementById('page1').style.display = 'none';
    // 显示输入界面
    document.getElementById('page2').style.display = 'block';
    // 更新当前页面
    currentPage = 2;
}

// 开始语音输入
function startVoiceInput() {
    try {
    if (!recognition) {
            // 初始化语音识别
            recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            recognition.lang = 'zh-CN';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = (event) => {
                const text = event.results[0][0].transcript;
                const anxietyInput = document.getElementById('anxietyInput');
                if (anxietyInput) {
                    anxietyInput.value = text;
                }
                stopVoiceInput();
            };

            recognition.onerror = (event) => {
                console.error('语音识别错误:', event.error);
                stopVoiceInput();
                alert('语音识别失败，请重试或使用键盘输入');
            };

            recognition.onend = () => {
                stopVoiceInput();
            };
        }

        if (!isListening) {
    recognition.start();
            isListening = true;
            const button = document.querySelector('button[onclick="startVoiceInput()"]');
            if (button) {
                button.textContent = '停止语音输入';
            }
        } else {
            stopVoiceInput();
        }
    } catch (error) {
        console.error('启动语音输入失败:', error);
        alert('您的浏览器可能不支持语音识别，请使用键盘输入');
    }
}

// 停止语音输入
function stopVoiceInput() {
    if (recognition && isListening) {
        recognition.stop();
        isListening = false;
        const button = document.querySelector('button[onclick="startVoiceInput()"]');
        if (button) {
            button.textContent = '语音输入';
        }
    }
}

// 怪物表情集合
const monsterStyles = {
    pixel: ['👾', '👹', '👻', '🤖', '👽', '😈', '💀', '👺'],
    cute: ['😈', '👹', '👺', '🤡', '👻', '💩', '👽', '🤖'],
    scary: ['👹', '👺', '😈', '💀', '👻', '🤖', '👽', '👾'],
    current: 'pixel' // 默认使用像素风格
};

// 生成怪物表情
function generateMonsterEmoji() {
    const emojis = monsterStyles[monsterStyles.current];
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    document.getElementById('monster').textContent = randomEmoji;
}

// 切换怪物样式
function changeMonsterStyle(style) {
    monsterStyles.current = style;
    generateMonsterEmoji();
}

// 提交焦虑内容
async function submitAnxiety() {
    // 获取文本框内容
    const anxietyText = document.getElementById('anxietyInput').value.trim();
    
    // 验证输入
    if (!anxietyText) {
        alert('请输入您的焦虑内容');
        return;
    }

    try {
        // 等待分析完成
        await analyzeAnxiety();
    } catch (error) {
        console.error('提交焦虑内容失败:', error);
        alert('提交失败，请重试');
    }
}

// 生成怪物名称
function generateMonsterName(anxietyText) {
    const prefixes = ['焦虑', '恐惧', '担忧', '压力'];
    const suffixes = ['怪物', '恶魔', '幽灵', '阴影'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    return prefix + suffix;
}

// 移除重复的initHandDetection函数，使用简化版initHandDetectionOnce替代

// 修改手部检测结果处理函数
// 按照用户要求编写 onHandsResults(results) 函数
// 按照用户要求编写 onHandsResults(results) 函数
function onHandsResults(results) {
    try {
        console.log('🔍 onHandsResults 被调用了，检查结果...');
        
        // 获取画布用于绘制手部关键点
        const canvas = document.getElementById('handCanvas');
        const ctx = canvas ? canvas.getContext('2d') : null;
        
        // 清除之前的绘制
        if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        
        // 使用MediaPipe检测挥手击打动作：检查 results.multiHandLandmarks
        if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
            // 没有检测到手部，重置状态
            lastWristY = null;
            lastWristX = null;
            console.log('❌ 未检测到手部');
            return;
        }
        
        console.log('✅ 检测到手部，开始分析挥手动作');
        
        // 绘制手部关键点和连接线
        if (ctx) {
            const landmarks = results.multiHandLandmarks[0];
            
            // 绘制绿色连接线
            ctx.strokeStyle = '#00FF00'; // 绿色
            ctx.lineWidth = 2;
            
            // 手部连接线定义
            const connections = [
                [0, 1], [1, 2], [2, 3], [3, 4], // 拇指
                [0, 5], [5, 6], [6, 7], [7, 8], // 食指
                [0, 9], [9, 10], [10, 11], [11, 12], // 中指
                [0, 13], [13, 14], [14, 15], [15, 16], // 无名指
                [0, 17], [17, 18], [18, 19], [19, 20], // 小指
                [0, 5], [5, 9], [9, 13], [13, 17] // 手掌连接
            ];
            
            // 绘制连接线
            connections.forEach(([start, end]) => {
                const startPoint = landmarks[start];
                const endPoint = landmarks[end];
                
                ctx.beginPath();
                ctx.moveTo(startPoint.x * canvas.width, startPoint.y * canvas.height);
                ctx.lineTo(endPoint.x * canvas.width, endPoint.y * canvas.height);
                ctx.stroke();
            });
            
            // 绘制红色关键点
            ctx.fillStyle = '#FF0000'; // 红色
            landmarks.forEach((landmark, index) => {
                ctx.beginPath();
                ctx.arc(
                    landmark.x * canvas.width,
                    landmark.y * canvas.height,
                    3, // 半径
                    0,
                    2 * Math.PI
                );
                ctx.fill();
                
                // 为手腕点添加标签
                if (index === 0) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.font = '12px Arial';
                    ctx.fillText('手腕', landmark.x * canvas.width + 5, landmark.y * canvas.height - 5);
                    ctx.fillStyle = '#FF0000';
                }
            });
            
            console.log('🎨 已绘制手部关键点和连接线');
        }

        // 获取第一只手的关键点
        const landmarks = results.multiHandLandmarks[0];
        
        // 分析手腕和指尖坐标，判断挥手动作 - 增强版检测
        const wrist = landmarks[0];          // 手腕关键点
        const indexTip = landmarks[8];       // 食指尖关键点
        const middleTip = landmarks[12];     // 中指尖关键点
        const pinkyTip = landmarks[20];      // 小指尖关键点
        const thumbTip = landmarks[4];       // 拇指尖关键点
        
        // 多维度坐标追踪，提高检测精度
        const currentWristX = wrist.x * video.width;
        const currentWristY = wrist.y * video.height;
        
        // 初始化参考位置
        if (lastWristY === null || lastWristX === null) {
            lastWristY = currentWristY;
            lastWristX = currentWristX;
            console.log('📍 初始化手腕位置:', `X:${currentWristX.toFixed(1)}, Y:${currentWristY.toFixed(1)}`);
            return;
        }
        
        // 计算多维度移动距离 - 降低阈值提高灵敏度
        const wristMovementY = Math.abs(currentWristY - lastWristY);
        const wristMovementX = Math.abs(currentWristX - lastWristX);
        const totalWristMovement = Math.sqrt(wristMovementX * wristMovementX + wristMovementY * wristMovementY);
        
        // 大幅降低阈值，提高灵敏度
        const hasWristMovementY = wristMovementY > 20; // 从50降低到20
        const hasWristMovementX = wristMovementX > 30; // 新增X轴检测
        const hasTotalMovement = totalWristMovement > 35; // 综合移动距离
        
        // 手掌张开检测 - 多个指标
        const palmWidth = Math.hypot(
            pinkyTip.x - indexTip.x,
            pinkyTip.y - indexTip.y
        ) * video.width;
        
        const palmHeight = Math.hypot(
            middleTip.x - wrist.x,
            middleTip.y - wrist.y
        ) * video.height;
        
        // 手指伸展度检测
        const fingerSpread = Math.hypot(
            thumbTip.x - pinkyTip.x,
            thumbTip.y - pinkyTip.y
        ) * video.width;
        
        // 降低手掌检测阈值
        const isPalmWidthIncreased = palmWidth > 60; // 从80降低到60
        const isPalmHeightIncreased = palmHeight > 80; // 新增高度检测
        const isFingerSpreadWide = fingerSpread > 90; // 手指张开检测
        
        // 多条件组合判断挥手动作 - 更灵敏
        const waveConditions = {
            wristY: hasWristMovementY,
            wristX: hasWristMovementX,
            totalMove: hasTotalMovement,
            palmWidth: isPalmWidthIncreased,
            palmHeight: isPalmHeightIncreased,
            fingerSpread: isFingerSpreadWide
        };
        
        // 任意两个条件满足即可识别为挥手（提高灵敏度）
        const conditionCount = Object.values(waveConditions).filter(Boolean).length;
        const isWaving = conditionCount >= 2;
        
        console.log(`👋 增强挥手检测:`);
        console.log(`   手腕Y移动: ${wristMovementY.toFixed(1)}px (阈值20) ✓${waveConditions.wristY}`);
        console.log(`   手腕X移动: ${wristMovementX.toFixed(1)}px (阈值30) ✓${waveConditions.wristX}`);
        console.log(`   总移动距离: ${totalWristMovement.toFixed(1)}px (阈值35) ✓${waveConditions.totalMove}`);
        console.log(`   手掌宽度: ${palmWidth.toFixed(1)}px (阈值60) ✓${waveConditions.palmWidth}`);
        console.log(`   手掌高度: ${palmHeight.toFixed(1)}px (阈值80) ✓${waveConditions.palmHeight}`);
        console.log(`   手指张开: ${fingerSpread.toFixed(1)}px (阈值90) ✓${waveConditions.fingerSpread}`);
        console.log(`   条件满足: ${conditionCount}/6, 检测到挥手: ${isWaving}`);
        
        // 若武器为"挥手攻击"则调用 attackMonster() 扣除怪物血量
        const weaponSelect = document.getElementById('weaponSelect');
        const currentWeapon = weaponSelect ? weaponSelect.value : 'wave';
        
        if (currentWeapon === 'wave' && isWaving && !handGestureState) {
            console.log('👋 检测到挥手击打动作！触发攻击');
            handGestureState = true; // 通过 handGestureState 避免重复触发
            
            // 调用 attackMonster() 扣除怪物血量
            attackMonster('wave');
            
            // 设置较短冷却时间，提高响应速度
            setTimeout(() => {
                handGestureState = false;
                console.log('⏰ 挥手攻击冷却结束');
            }, 300); // 从500ms缩短到300ms
        }
        
        // 更新手腕位置用于下次比较
        lastWristY = currentWristY;
        lastWristX = currentWristX;
        
    } catch (error) {
        console.error('手部动作检测出错:', error);
    }
    
    // 注意：不在这里调用hands.send，避免与startCamera中的sendFrame循环冲突
}

// 检测手掌是否张开
function checkPalmOpen(landmarks) {
    // 检查各个手指是否伸展
    const fingers = [
        // 拇指：比较拇指尖和拇指第一关节的位置
        landmarks[4].x > landmarks[3].x, // 拇指（右手向右伸展）
        // 食指：比较指尖和掌指关节的Y坐标
        landmarks[8].y < landmarks[6].y,
        // 中指
        landmarks[12].y < landmarks[10].y,
        // 无名指
        landmarks[16].y < landmarks[14].y,
        // 小指
        landmarks[20].y < landmarks[18].y
    ];
    
    // 至少3个手指伸展才算手掌张开
    const extendedFingers = fingers.filter(Boolean).length;
    return extendedFingers >= 3;
}

// 两阶段手势处理
function processTwoPhaseGesture(isPalmOpen, palmWidth, wristMovement, currentTime) {
    const phase = handGesturePhase;
    
    switch (phase.current) {
        case 'none':
            // 第一阶段：检测手掌举起
            if (isPalmOpen && palmWidth > DETECTION_CONFIG.PALM_WIDTH_THRESHOLD) {
                phase.current = 'palm_detected';
                phase.palmDetectedTime = currentTime;
                console.log('👋 第一阶段：检测到手掌举起，请保持1秒后挥手攻击');
            }
            break;
            
        case 'palm_detected':
            // 检查是否持续举起手掌
            if (isPalmOpen && palmWidth > DETECTION_CONFIG.PALM_WIDTH_THRESHOLD) {
                // 检查是否已经保持足够时间
                if (currentTime - phase.palmDetectedTime >= phase.palmHoldDuration) {
                    phase.current = 'ready_to_wave';
                    console.log('✋ 第二阶段：手掌已稳定，现在可以挥手攻击了！');
                }
            } else {
                // 手掌放下了，重置状态
                console.log('❌ 手掌放下，重置检测状态');
                resetHandGesturePhase();
            }
            break;
            
        case 'ready_to_wave':
            // 第二阶段：检测挥手动作
            const isWaving = wristMovement > DETECTION_CONFIG.WAVE_THRESHOLD;
            
            if (isWaving) {
                // 检测到挥手，触发攻击
                console.log('🎯 检测到挥手动作！触发攻击');
                handGestureState = true;
                phase.lastWaveTime = currentTime;
                
                // 触发攻击
                attackMonster('wave');
                
                // 重置状态并设置冷却时间
                resetHandGesturePhase();
                setTimeout(() => {
                    handGestureState = false;
                    console.log('⏰ 挥手冷却结束，可以重新举起手掌');
                }, ATTACK_CONFIG.wave.cooldown);
                
            } else if (currentTime - phase.palmDetectedTime > phase.waveWindow) {
                // 超时未挥手，重置状态
                console.log('⏰ 挥手窗口超时，请重新举起手掌');
                resetHandGesturePhase();
            }
            break;
    }
    
    // 输出调试信息
    if (currentWeapon === 'wave') {
        console.log(`🖐️ 手势状态: ${phase.current}, 手掌张开: ${isPalmOpen}, 手掌宽度: ${palmWidth.toFixed(1)}, 移动距离: ${wristMovement.toFixed(1)}, 冷却中: ${handGestureState}`);
    }
}

// 重置手势识别状态
function resetHandGesturePhase() {
    handGesturePhase.current = 'none';
    handGesturePhase.palmDetectedTime = 0;
}

// 按照用户要求编写 startCamera() 函数
async function startCamera() {
    try {
        console.log('🎥 正在启动摄像头...');
        
        // 1. 获取视频元素（#video）
        video = document.getElementById('video');
        if (!video) {
            throw new Error('找不到视频元素');
        }
        console.log('✅ 视频元素获取成功');

        // 2. 使用 navigator.mediaDevices.getUserMedia 获取视频流（仅视频）
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: true 
        });
        console.log('✅ 视频流获取成功');

        // 3. 绑定到视频元素
        video.srcObject = stream;
        await video.play();
        console.log('📹 摄像头已启动，视频正在播放');
        
        // 启动调试信息显示
        startDebugInfo();

        // 4. 初始化FaceMesh模型：使用 facemesh.load() 加载模型，加载完成后调用 detectSmile()
        console.log('🔄 开始加载FaceMesh模型...');
        faceMesh = await facemesh.load();
        console.log('😊 FaceMesh模型加载完成');
        detectSmile(); // 加载完成后调用 detectSmile()

        // 5. 初始化MediaPipe手部检测：使用简化版函数避免重复初始化
        console.log('🔄 开始初始化MediaPipe手部检测...');
        
        try {
            // 延迟1秒启动，确保视频完全准备就绪
            setTimeout(async () => {
                if (video && video.readyState >= 2) {
                    console.log('📹 视频就绪，启动手部检测');
                    await startHandDetectionSimple();
                } else {
                    console.log('⚠️ 视频未就绪，跳过手部检测');
                }
            }, 1000);
            
        } catch (error) {
            console.error('❌ 手部检测启动失败:', error);
        }
        

        
        console.log('👋 MediaPipe手部检测初始化完成，开始持续检测');
        
        // 添加视频状态检查
        setTimeout(() => {
            console.log('📊 视频状态检查:');
            console.log('- 视频宽度:', video.videoWidth);
            console.log('- 视频高度:', video.videoHeight);
            console.log('- 视频就绪状态:', video.readyState);
            console.log('- 手部检测激活:', handDetectionActive);
            console.log('- Hands对象存在:', !!hands);
        }, 2000);
        
        console.log('🎯 startCamera() 函数执行完成，所有功能已启动');

        return true;
        
    } catch (error) {
        console.error('启动摄像头失败:', error);
        handleCameraError(error);
        throw error;
    }
}

// 添加错误处理工具函数
function handleCameraError(error) {
    let errorMessage = '启动摄像头时出错: ';
    
    switch (error.name) {
        case 'NotAllowedError':
            errorMessage += '请允许访问摄像头权限';
            break;
        case 'NotFoundError':
            errorMessage += '未找到摄像头设备';
            break;
        case 'NotReadableError':
            errorMessage += '摄像头被占用';
            break;
        case 'OverconstrainedError':
            errorMessage += '摄像头不支持请求的分辨率';
            break;
        default:
            errorMessage += error.message;
    }
    
    console.error(errorMessage);
    alert(errorMessage);
}

// 在页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    stopHandDetection();
});

// 绘制连接线函数
// 移除未使用的绘图函数 drawConnectors、drawLandmarks 和 HAND_CONNECTIONS

// 添加状态显示函数
function updateDebugInfo() {
    let debugInfo = document.getElementById('debugInfo');
    if (!debugInfo) {
        debugInfo = document.createElement('div');
        debugInfo.id = 'debugInfo';
        debugInfo.style.cssText = `
            position: fixed;
            bottom: 10px;
            left: 10px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 12px;
            z-index: 1000;
            max-width: 300px;
        `;
        document.body.appendChild(debugInfo);
    }
    
    debugInfo.innerHTML = `
        当前武器: ${currentWeapon}<br>
        手势状态: ${handGestureState ? '冷却中' : '可攻击'}<br>
        微笑状态: ${isSmiling ? '微笑中' : '未微笑'}<br>
        怪物血量: ${monster.hp}/${GAME_CONFIG.maxHP}<br>
        手部检测: ${handDetectionActive ? '运行中' : '已停止'}<br>
        视频状态: ${video ? (video.paused ? '暂停' : '播放中') : '未初始化'}<br>
        MediaPipe: ${hands ? '已加载' : '未加载'}
    `;
}

// 启动调试信息更新
function startDebugInfo() {
    setInterval(updateDebugInfo, 500); // 每0.5秒更新一次
}

// 按照用户要求编写 attackMonster() 函数
function attackMonster(type) {
    try {
        // 检查怪物是否存在
        if (!monster) {
            console.log('怪物不存在');
            return;
        }

        // 减少怪物HP（monster.hp--）
        monster.hp--;
        console.log(`💥 ${type}攻击造成1点伤害，怪物剩余HP: ${monster.hp}`);
        
        // 调用 updateHP(monster.hp) 更新显示
        updateHP(monster.hp);
        
        // 添加抖动效果（#monster.classList.add("shake")）
        const monsterElement = document.getElementById('monster');
        if (monsterElement) {
            monsterElement.classList.add('shake');
            
            // 500ms后移除抖动效果
            setTimeout(() => {
                monsterElement.classList.remove('shake');
            }, 500);
        }
        
        // 若HP<=0，调用 defeatMonster()
        if (monster.hp <= 0) {
            console.log('🎉 怪物被击败！');
            defeatMonster();
        }
        
    } catch (error) {
        console.error('攻击怪物时出错:', error);
    }
}



// 打字效果函数
function typeText(text, elementId, speed = 50) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    let index = 0;
    element.textContent = '';
    
    function type() {
        if (index < text.length) {
            element.textContent += text[index];
            index++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// 修改showVictory函数
function showVictory() {
    // 隐藏战斗界面
    showPage(4);
    
    // 生成鼓励语
    const encouragement = generateEncouragement();
    document.getElementById('encouragement').textContent = encouragement;
    
    // 生成恢复卡
    generateRecoveryCard(encouragement);
    
    // 3秒后显示总结页面
    setTimeout(() => {
        showPage(5);
        const summaryText = "焦虑不是必须隐藏的敌人，\n而是值得被看见、被理解的信号。\n通过游戏，我们尝试用一种更轻松的方式，\n帮助你接住那些情绪，\n然后，继续前进。";
        typeText(summaryText, 'typingText', 100);
    }, 3000);
}

// 生成鼓励语
function generateEncouragement() {
    const encouragements = [
        "太棒了！你成功战胜了焦虑！记住，每一次的胜利都是你变得更强大的证明。",
        "恭喜你！你不仅打败了焦虑，还展现出了惊人的勇气和决心！",
        "胜利属于你！这次的成功证明你有能力面对任何挑战！",
        "做得好！你用实际行动证明了焦虑是可以被战胜的！",
        "太厉害了！你的勇气和坚持让你获得了这场胜利！"
    ];
    return encouragements[Math.floor(Math.random() * encouragements.length)];
}

// 生成恢复卡
function generateRecoveryCard(encouragement) {
    try {
        const canvas = document.getElementById('recoveryCard');
        const ctx = canvas.getContext('2d');
        
        // 设置画布尺寸
        canvas.width = 400;
        canvas.height = 300;
        
                // 绘制背景
        ctx.fillStyle = '#E6F0FF';  // 浅蓝色背景
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 绘制虚线边框
        ctx.strokeStyle = '#8A80FF';  // 紫色边框
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 5]);  // 设置虚线样式
        ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
        
        // 绘制标题
        ctx.fillStyle = '#1A237E';  // 深蓝色文字
        ctx.font = 'bold 24px "Press Start 2P", "汉仪像素行楷15px 简", cursive';
        ctx.textAlign = 'center';
        ctx.fillText('情绪恢复卡', canvas.width / 2, 50);
        
        // 获取怪物名称
        const monsterData = JSON.parse(sessionStorage.getItem('monster'));
        const monsterName = monsterData ? monsterData.monsterData.name : '焦虑怪物';
        
        // 绘制怪物名称
        ctx.font = '18px "Press Start 2P", "汉仪像素行楷15px 简", cursive';
        ctx.fillText(`击败: ${monsterName}`, canvas.width / 2, 90);
        
        // 绘制鼓励语
        ctx.font = '16px "Press Start 2P", "汉仪像素行楷15px 简", cursive';
        const words = encouragement.split('');
        let line = '';
        let y = 130;
        const maxWidth = canvas.width - 40;
        
        for (let word of words) {
            const testLine = line + word;
            const metrics = ctx.measureText(testLine);
            if (metrics.width > maxWidth) {
                ctx.fillText(line, canvas.width / 2, y);
                line = word;
                y += 30;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, canvas.width / 2, y);
        
        // 绘制底部文字
        ctx.font = 'bold 20px "Press Start 2P", "汉仪像素行楷15px 简", cursive';
        ctx.fillText('你是最棒的！🌟', canvas.width / 2, canvas.height - 40);
        
        // 绘制装饰性云朵
        function drawCloud(x, y, size) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(x, y, size, 0, Math.PI * 2);
            ctx.arc(x + size * 0.8, y - size * 0.2, size * 0.8, 0, Math.PI * 2);
            ctx.arc(x + size * 1.6, y, size * 0.9, 0, Math.PI * 2);
            ctx.arc(x + size * 0.8, y + size * 0.2, size * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // 添加多个云朵
        drawCloud(50, 50, 15);
        drawCloud(350, 80, 20);
        drawCloud(200, 200, 25);
        
        // 绘制光晕效果
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, 0,
            canvas.width / 2, canvas.height / 2, 150
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
    } catch (error) {
        console.error('生成恢复卡时出错:', error);
        alert('生成恢复卡失败，请重试');
    }
}

// 下载恢复卡
function downloadCard() {
    try {
        const canvas = document.getElementById('recoveryCard');
        if (!canvas) {
            throw new Error('找不到恢复卡画布');
        }

        // 将 canvas 转换为 PNG 图片
        const imageData = canvas.toDataURL('image/png');
        
        // 创建下载链接
        const downloadLink = document.createElement('a');
        downloadLink.href = imageData;
        downloadLink.download = 'recovery_card.png';
        
        // 添加到文档中并触发点击
        document.body.appendChild(downloadLink);
        downloadLink.click();
        
        // 清理 DOM
        document.body.removeChild(downloadLink);
    } catch (error) {
        console.error('下载恢复卡时出错:', error);
        alert('下载恢复卡失败，请重试');
    }
}

// 修改restartGame函数
function restartGame() {
    try {
        // 重置怪物状态
        monster = { hp: GAME_CONFIG.maxHP };
        
        // 重置武器选择
        currentWeapon = 'wave';
        const weaponSelect = document.getElementById('weaponSelect');
        if (weaponSelect) {
            weaponSelect.value = 'wave';
        }
        
        // 重置检测状态
        handGestureState = false;
        isSmiling = false;
        initialMouthDistance = null;
        lastWristY = null;
        
        // 重置手势识别状态
        resetHandGesturePhase();
        
        // 重置持续检测状态
        Object.keys(continuousDetectionState).forEach(type => {
            const state = continuousDetectionState[type];
            state.isActive = false;
            state.detectionCount = 0;
            if (state.resetTimer) {
                clearTimeout(state.resetTimer);
                state.resetTimer = null;
            }
        });
        console.log('🔄 游戏重启 - 已重置所有持续检测状态');
        
        // 更新HP条
        updateHP(monster.hp);
        
        // 更新调试信息
        updateDebugInfo();
        
        // 返回第一页
        showPage(1);
        
        console.log('游戏已重置');
    } catch (error) {
        console.error('重置游戏时出错:', error);
    }
}

// 分析焦虑
async function analyzeAnxiety() {
    // 获取文本框内容
    const anxietyText = document.getElementById('anxietyInput').value.trim();
    
    // 验证输入
    if (!anxietyText) {
        alert('请输入您的焦虑内容');
        return;
    }
    
    try {
        // 调用 simulateGPT 获取分析结果
        const analysisResult = await simulateGPT(anxietyText);
    
        // 将结果存储到 sessionStorage
        sessionStorage.setItem('monster', JSON.stringify({
            keywords: analysisResult.keywords,
            intensity: analysisResult.anxietyLevel,
            monsterData: analysisResult.monsterData
        }));
    
        // 显示分析结果和继续按钮
        alert('分析完成！您的焦虑怪物已生成，点击"开始战斗"按钮进入战斗界面！');
        
        // 在第二页添加开始战斗按钮
        const page2 = document.getElementById('page2');
        const existingBattleBtn = document.getElementById('startBattleBtn');
        if (!existingBattleBtn && page2) {
            const battleButton = document.createElement('button');
            battleButton.id = 'startBattleBtn';
            battleButton.className = 'cartoon-btn';
            battleButton.textContent = '开始战斗';
            battleButton.onclick = async () => {
                // 隐藏当前页面
                page2.classList.remove('show');
                setTimeout(() => {
                    page2.style.display = 'none';
                }, 250);
                
                // 显示战斗页面
                setTimeout(async () => {
                    const page3 = document.getElementById('page3');
                    if (page3) {
                        page3.style.display = 'block';
                        page3.offsetHeight;
                        page3.classList.add('show');
                        
                        await new Promise(resolve => setTimeout(resolve, 300));
                        await setupBattle();
                    }
                }, 250);
            };
            
            // 将按钮添加到第二页的按钮组中
            const buttonGroup = page2.querySelector('.button-group');
            if (buttonGroup) {
                buttonGroup.appendChild(battleButton);
            }
        }
        
    } catch (error) {
        console.error('分析焦虑内容失败:', error);
        alert('分析失败，请重试');
    }
}

// 初始化战斗界面
async function setupBattle() {
    try {
        // 从 sessionStorage 获取怪物数据
        const monsterData = JSON.parse(sessionStorage.getItem('monster'));
        if (!monsterData) {
            throw new Error('未找到怪物数据');
        }

        // 重置怪物状态为满血
        monster = { hp: GAME_CONFIG.maxHP };

        // 更新怪物名称
        const monsterNameElement = document.getElementById('monsterName');
        if (monsterNameElement) {
            monsterNameElement.textContent = monsterData.monsterData.name;
        }

        // 等待一小段时间确保页面元素完全加载
        await new Promise(resolve => setTimeout(resolve, 300));

        // 确保视频元素存在
        const cameraVideo = document.getElementById('video');
        if (!cameraVideo) {
            throw new Error('找不到摄像头视频元素');
        }

        // 设置怪物视频
        const monsterVideo = document.getElementById('monsterVideo');
        if (!monsterVideo) {
            console.error('找不到monsterVideo元素 (setupBattle)');
            // 尝试重新获取元素
            await new Promise(resolve => setTimeout(resolve, 200));
            const retryVideo = document.getElementById('monsterVideo');
            if (!retryVideo) {
                throw new Error('无法找到monsterVideo元素');
            }
        }

        // 设置视频
        setRandomMonsterVideo();

        // 根据焦虑等级显示提示文本
        const levelText = document.createElement('p');
        levelText.className = 'retro-text';
        
        if (monsterData.anxietyLevel <= 4) {
            levelText.textContent = '简单小怪';
        } else if (monsterData.anxietyLevel <= 7) {
            levelText.textContent = '中等怪兽';
        } else {
            levelText.textContent = '超级Boss';
        }
        
        // 将提示文本添加到战斗界面
        const monsterElement = document.getElementById('monster');
        if (monsterElement) {
            monsterElement.parentElement.insertBefore(levelText, monsterElement);
        }

        // 更新HP条显示满血状态
        updateHP(GAME_CONFIG.maxHP);

        // 启动摄像头，确保在第三页正确显示
        console.log('正在启动摄像头...');
        try {
            // 检查摄像头是否已经运行
            if (cameraVideo.srcObject) {
                console.log('摄像头已经在运行，检查状态...');
                const tracks = cameraVideo.srcObject.getTracks();
                const videoTrack = tracks.find(track => track.kind === 'video');
                
                if (videoTrack && videoTrack.readyState === 'live') {
                    console.log('摄像头状态正常，无需重新初始化');
                    // 确保视频正在播放
                    if (cameraVideo.paused) {
                        await cameraVideo.play();
                    }
                } else {
                    console.log('摄像头状态异常，重新初始化...');
                    await startCameraSimple();
                }
            } else {
                console.log('摄像头未运行，开始初始化...');
                await startCameraSimple();
            }
            
            // 添加额外的调试信息
            console.log('摄像头元素状态:', {
                element: !!cameraVideo,
                display: window.getComputedStyle(cameraVideo).display,
                visibility: window.getComputedStyle(cameraVideo).visibility,
                width: cameraVideo.offsetWidth,
                height: cameraVideo.offsetHeight,
                srcObject: !!cameraVideo.srcObject,
                readyState: cameraVideo.readyState,
                videoWidth: cameraVideo.videoWidth,
                videoHeight: cameraVideo.videoHeight
            });
            
            // 如果视频元素不可见，尝试修复
            if (cameraVideo.offsetWidth === 0 || cameraVideo.offsetHeight === 0) {
                console.log('检测到video元素不可见，尝试修复...');
                cameraVideo.style.display = 'block';
                cameraVideo.style.visibility = 'visible';
                cameraVideo.style.width = '320px';
                cameraVideo.style.height = '240px';
            }
            
            console.log('摄像头启动成功');
        } catch (error) {
            console.error('摄像头启动失败:', error);
            // 如果摄像头启动失败，给用户明确提示
            alert('摄像头启动失败，请确保已授予摄像头权限，然后刷新页面重试。可能的解决方案：\n1. 刷新页面\n2. 检查摄像头是否被其他应用占用\n3. 重新授予摄像头权限');
        }

        // 初始化武器选择下拉菜单
        const weaponSelect = document.getElementById('weaponSelect');
        if (weaponSelect) {
        weaponSelect.innerHTML = `
            <option value="wave">挥手攻击</option>
                <option value="smile">微笑攻击</option>
            <option value="click">点击攻击</option>
        `;
            // 设置默认武器为挥手
            weaponSelect.value = 'wave';
            currentWeapon = 'wave';
        }
        
        // 更新调试信息
        updateDebugInfo();
        
    } catch (error) {
        console.error('设置战斗界面失败:', error);
        alert('初始化战斗界面失败，请重试');
    }
}

// 模拟GPT分析
function simulateGPT(input) {
    // 焦虑关键词列表
    const anxietyKeywords = ['焦虑', '压力', '担心', '害怕', '恐惧', '紧张', '不安', '失败', '失望', '挫折', '困难', '问题', '担心', '忧虑', '害怕', '恐惧', '紧张', '不安'];
    
    // 提取关键词
    const keywords = anxietyKeywords.filter(keyword => input.includes(keyword));
    
    // 生成焦虑强度（1-10）
    const anxietyLevel = Math.floor(Math.random() * 10) + 1;
    
    // 根据强度设置怪物等级
    let monsterLevel;
    if (anxietyLevel <= 4) {
        monsterLevel = {
            emoji: "😐",
            hp: 2,
            type: "轻度"
        };
    } else if (anxietyLevel <= 7) {
        monsterLevel = {
            emoji: "😟",
            hp: 4,
            type: "中度"
        };
    } else {
        monsterLevel = {
            emoji: "😨",
            hp: 6,
            type: "重度"
        };
    }
    
    // 情感类型列表
    const emotionTypes = ['社交焦虑', '学业压力', '工作压力', '人际关系', '未来担忧', '自我怀疑', '健康焦虑', '经济压力'];
    
    // 随机选择情感类型
    const emotionType = emotionTypes[Math.floor(Math.random() * emotionTypes.length)];
    
    // 生成怪物名称
    const prefixes = ['焦虑', '恐惧', '担忧', '压力'];
    const suffixes = ['怪物', '恶魔', '幽灵', '阴影'];
    const monsterName = prefixes[Math.floor(Math.random() * prefixes.length)] + 
                        suffixes[Math.floor(Math.random() * suffixes.length)];
    
    // 生成怪物描述
    const descriptions = [
        '一个由负面情绪凝聚而成的怪物，散发着令人不安的气息。',
        '由焦虑和恐惧编织而成的阴影，在黑暗中若隐若现。',
        '一个充满压力的能量体，不断释放着令人窒息的压迫感。',
        '由担忧和不安构成的幻影，在空气中飘忽不定。'
    ];
    const description = descriptions[Math.floor(Math.random() * descriptions.length)];
    
    // 鼓励语列表
    const encouragements = [
        '别担心，每个困难都是成长的机会！',
        '相信自己，你有能力战胜任何挑战！',
        '记住，你比想象中更强大！',
        '深呼吸，让我们一起面对这个挑战！',
        '你的勇气和坚持会帮助你克服一切！',
        '每一个焦虑都是暂时的，阳光总在风雨后！',
        '你并不孤单，让我们一起战胜它！',
        '保持希望，美好的未来在等着你！'
    ];
    const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];
    
    // 返回分析结果
    return {
        keywords: keywords,
        anxietyLevel: anxietyLevel,
        monsterData: {
            name: monsterName,
            emotion_type: emotionType,
        description: description,
        hp: monsterLevel.hp,
        emoji: monsterLevel.emoji,
            level: monsterLevel.type
        },
        encouragement: encouragement
    };
}

// 更新HP条
function updateHP(hp) {
    // 确保 hp 在有效范围内
    hp = Math.max(0, Math.min(hp, GAME_CONFIG.maxHP));
    
    // 计算 HP 百分比
    const hpPercentage = (hp / GAME_CONFIG.maxHP) * 100;
    
    // 更新 HP 条填充元素的宽度
    const hpFill = document.getElementById('hpFill');
    if (hpFill) {
        hpFill.style.width = `${hpPercentage}%`;
        
        // 根据 HP 百分比设置颜色
        if (hpPercentage > 60) {
            hpFill.style.backgroundColor = '#4CAF50'; // 绿色
        } else if (hpPercentage > 30) {
            hpFill.style.backgroundColor = '#FFC107'; // 黄色
        } else {
            hpFill.style.backgroundColor = '#F44336'; // 红色
        }
    }
    
    // 更新怪物对象的 HP
    monster.hp = hp;
    
    // 如果 HP 为 0，显示胜利界面
    if (hp <= 0) {
        showVictory();
    }
}

// 手动攻击函数
// 按照用户要求编写手动攻击函数
// 按照用户要求编写手动攻击函数
function manualAttack() {
    // 获取当前选择的武器
    const weaponSelect = document.getElementById('weaponSelect');
    const currentWeapon = weaponSelect ? weaponSelect.value : 'click';
    
    console.log('🎯 手动攻击触发，当前武器:', currentWeapon);
    
    // 根据选中武器调整逻辑：微笑攻击依赖 detectSmile()，挥手攻击依赖 onHandsResults()，鼠标点击直接触发
    switch (currentWeapon) {
        case 'smile':
            // 微笑攻击依赖 detectSmile()
            if (faceMesh && video) {
                console.log('😊 微笑攻击模式：请对着摄像头微笑进行攻击！');
                alert('请对着摄像头微笑进行攻击！微笑检测正在运行中...');
            } else {
                console.log('❌ 微笑检测未就绪');
                alert('微笑检测未就绪，请等待摄像头启动完成');
            }
            break;
            
        case 'wave':
            // 挥手攻击依赖 onHandsResults()
            if (hands && video && handDetectionActive) {
                console.log('👋 挥手攻击模式：请对着摄像头挥手进行攻击！');
                alert('请对着摄像头挥手进行攻击！手部检测正在运行中...');
            } else {
                console.log('❌ 手部检测未就绪');
                alert('手部检测未就绪，请等待摄像头启动完成');
            }
            break;
            
        case 'click':
        default:
            // 鼠标点击直接触发
            console.log('🖱️ 鼠标点击攻击：直接触发攻击');
            attackMonster('click');
            break;
    }
}

// 按照用户要求编写事件绑定函数：为"手动攻击"按钮和武器选择（#weaponSelect）绑定 attackMonster()，根据选中武器调整逻辑
function initEventListeners() {
    try {
        console.log('🔧 开始初始化事件监听器');
        
        // 为武器选择（#weaponSelect）绑定事件
        const weaponSelect = document.getElementById('weaponSelect');
        if (!weaponSelect) {
            console.warn('找不到武器选择元素，将使用默认武器: wave');
            currentWeapon = 'wave';
        } else {
            // 设置默认武器
            currentWeapon = 'wave';
            weaponSelect.value = 'wave';
            
            // 武器选择变更事件：根据选中武器调整逻辑
            weaponSelect.addEventListener('change', (e) => {
                const selectedWeapon = e.target.value;
                console.log('🔄 武器切换到:', selectedWeapon);
                
                // 根据选中武器调整逻辑：微笑攻击依赖 detectSmile()，挥手攻击依赖 onHandsResults()，鼠标点击直接触发
                switch (selectedWeapon) {
                    case 'smile':
                        // 微笑攻击依赖 detectSmile()
                        console.log('😊 启用微笑攻击模式 - 依赖 detectSmile()');
                        if (!faceMesh || !video) {
                            console.log('⚠️ 微笑检测未就绪，正在初始化...');
                            // 尝试初始化面部检测
                            initFaceDetection().then(() => {
                                if (faceMesh && video) {
                                    console.log('✅ 面部检测初始化完成，启动微笑检测');
                                    isDetectingSmile = true;
                                    detectSmile(); // 启动微笑检测
                                    alert('微笑检测已启动！请对着摄像头微笑攻击怪物');
                                } else {
                                    console.error('❌ 面部检测初始化失败');
                                    alert('微笑检测初始化失败，请确保摄像头正常工作');
                                }
                            }).catch(error => {
                                console.error('❌ 初始化面部检测失败:', error);
                                alert('微笑检测启动失败，请重新选择武器');
                            });
                        } else {
                            console.log('✅ 微笑检测已就绪，启动微笑检测');
                            isDetectingSmile = true;
                            detectSmile(); // 启动微笑检测
                            alert('微笑检测已启动！请对着摄像头微笑攻击怪物');
                        }
                        break;
                        
                    case 'wave':
                        // 挥手攻击依赖 onHandsResults()
                        console.log('👋 启用挥手攻击模式 - 依赖 onHandsResults()');
                        if (!hands || !video || !handDetectionActive) {
                            console.log('⚠️ 手部检测未就绪，正在启动...');
                            // 尝试启动手部检测
                            startHandDetectionSimple().then((success) => {
                                if (success) {
                                    console.log('✅ 手部检测启动成功');
                                    alert('手部检测已启动！请对着摄像头挥手攻击怪物');
                                } else {
                                    console.error('❌ 手部检测启动失败');
                                    alert('手部检测启动失败，请确保摄像头正常工作');
                                }
                            }).catch(error => {
                                console.error('❌ 启动手部检测失败:', error);
                                alert('手部检测启动失败，请重新选择武器');
                            });
                        } else {
                            console.log('✅ 手部检测已就绪，现在可以挥手攻击');
                            alert('手部检测已就绪！请对着摄像头挥手攻击怪物');
                        }
                        break;
                        
                    case 'click':
                        // 鼠标点击直接触发
                        console.log('🖱️ 启用鼠标点击攻击模式 - 直接触发');
                        console.log('✅ 点击攻击已就绪，现在可以点击攻击');
                        break;
                        
                    default:
                        console.log('❓ 未知武器类型，使用默认点击攻击');
                        break;
                }
                
                // 更新当前武器
                currentWeapon = selectedWeapon;
                updateDebugInfo();
            });
            
            console.log('✅ 武器选择事件绑定完成');
        }

        // 为"手动攻击"按钮绑定 attackMonster()
        const manualAttackButton = document.querySelector('button[onclick="manualAttack()"]');
        if (manualAttackButton) {
            // 移除原有的onclick属性，使用addEventListener
            manualAttackButton.removeAttribute('onclick');
            manualAttackButton.addEventListener('click', () => {
                console.log('🎯 手动攻击按钮被点击');
                manualAttack(); // 调用手动攻击函数，内部会根据武器类型调用 attackMonster()
            });
            console.log('✅ 手动攻击按钮事件绑定完成');
        } else {
            console.warn('❌ 找不到手动攻击按钮');
        }
        
                 // 额外绑定其他可能的攻击按钮
         const attackButtons = document.querySelectorAll('.cartoon-btn');
         attackButtons.forEach(button => {
             if (button.textContent.includes('攻击') || button.textContent.includes('手动')) {
                 button.addEventListener('click', () => {
                     console.log('🎯 攻击按钮被点击:', button.textContent);
                     manualAttack(); // 统一调用手动攻击函数
                 });
             }
         });
         
         console.log('🎮 所有事件监听器绑定完成');
        
        // 添加shake动画样式
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                75% { transform: translateX(5px); }
            }
            .shake {
                animation: shake 0.5s ease-in-out;
            }
            .hidden {
                display: none !important;
            }
        `;
        document.head.appendChild(styleSheet);
        
        console.log('事件监听器初始化完成');
        
    } catch (error) {
        console.error('初始化事件监听器时出错:', error);
        alert('初始化控制器失败，请刷新页面重试');
    }
}

// 击败怪物函数
function defeatMonster() {
    try {
        const monsterData = JSON.parse(sessionStorage.getItem('monster'));
        if (!monsterData) throw new Error('未找到怪物数据');

        // 停止所有检测
        isDetectingSmile = false;
        isDetectingHands = false;
        handDetectionActive = false;

        // 显示胜利提示和继续按钮
        alert('恭喜！您成功击败了焦虑怪物！点击"查看胜利"按钮进入胜利界面！');
        
        // 在第三页添加查看胜利按钮
        const page3 = document.getElementById('page3');
        const existingVictoryBtn = document.getElementById('viewVictoryBtn');
        if (!existingVictoryBtn && page3) {
            const victoryButton = document.createElement('button');
            victoryButton.id = 'viewVictoryBtn';
            victoryButton.className = 'cartoon-btn';
            victoryButton.textContent = '查看胜利';
            victoryButton.style.position = 'fixed';
            victoryButton.style.top = '50%';
            victoryButton.style.left = '50%';
            victoryButton.style.transform = 'translate(-50%, -50%)';
            victoryButton.style.zIndex = '1000';
            victoryButton.style.fontSize = '1.5rem';
            victoryButton.style.padding = '15px 30px';
            victoryButton.onclick = () => {
                // 移除胜利按钮
                victoryButton.remove();
                // 显示胜利界面
                showPage(4);
            };
            
            // 将按钮添加到页面中
            page3.appendChild(victoryButton);
        } else {
            // 如果按钮已存在，直接显示胜利界面
            showPage(4);
        }

        // 获取必要的DOM元素
        const encouragementElement = document.getElementById('encouragement');
        if (!encouragementElement) {
            throw new Error('找不到鼓励语元素');
        }

        // 设置鼓励语
        const encouragement = monsterData.encouragement || '恭喜你战胜了焦虑！继续保持积极的心态！';
        encouragementElement.textContent = encouragement;

        // 生成恢复卡
        generateRecoveryCard(encouragement);

        // 清理资源
        if (hands) {
            try {
                hands.close();
            } catch (e) {
                console.warn('关闭手部检测时出错:', e);
            }
            hands = null;
        }

        // 重置状态
        monster = { hp: GAME_CONFIG.maxHP };
        handGestureState = false;
        isSmiling = false;
        initialMouthDistance = null;
        lastWristY = null;

    } catch (error) {
        console.error('显示胜利界面时出错:', error);
        // 即使出错也要显示胜利界面
        showPage(4);
        alert('游戏胜利！但显示胜利界面时遇到问题。');
    }
}

// 初始化面部检测
async function initFaceDetection() {
    try {
        console.log('正在初始化面部检测...');
        
        // 如果已经初始化过，复用现有模型
        if (modelCache.isFaceMeshInitialized && modelCache.faceMesh) {
            console.log('复用已初始化的面部检测模型');
            faceMesh = modelCache.faceMesh;
            return true;
        }
        
        // 检查 FaceMesh 是否已加载
        if (faceMesh) {
            console.log('FaceMesh 已经初始化');
            return true;
        }

        // 配置 FaceMesh 参数
        const modelConfig = {
            maxFaces: 1,
            refineLandmarks: true,
            runtime: 'mediapipe',
            solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh'
        };
        
        // 加载 FaceMesh 模型 - 使用正确的API
        faceMesh = await facemesh.load();
        console.log('FaceMesh 模型加载完成');
        
        // 缓存模型以供复用
        modelCache.faceMesh = faceMesh;
        modelCache.isFaceMeshInitialized = true;
        
        // 重置初始嘴角距离
        initialMouthDistance = null;
        
        // 开始检测微笑
        detectSmile();
        
        return true;
    } catch (error) {
        console.error('面部检测初始化失败:', error);
        return false;
    }
}

// 按照用户要求编写 detectSmile() 函数
async function detectSmile() {
    try {
        // 检查必要条件
        if (!faceMesh || !video) {
            console.log('⚠️ FaceMesh或视频未就绪');
            requestAnimationFrame(detectSmile); // 使用 requestAnimationFrame(detectSmile) 持续检测
            return;
        }

        // 使用FaceMesh检测微笑攻击表情：调用 faceMesh.estimateFaces(video) 获取面部关键点
        const predictions = await faceMesh.estimateFaces(video);
        
        if (predictions && predictions.length > 0) {
            const face = predictions[0];
            console.log('✅ 检测到人脸，开始分析微笑');
            
            // 检查嘴角关键点距离变化（例如超过10%视为微笑）
            const leftMouthCornerIndex = 61;   // 左嘴角关键点
            const rightMouthCornerIndex = 291; // 右嘴角关键点
            
            let leftMouthCorner, rightMouthCorner;
            
            // 兼容不同版本的FaceMesh API
            if (face.keypoints) {
                // 新版本API
                leftMouthCorner = face.keypoints[leftMouthCornerIndex];
                rightMouthCorner = face.keypoints[rightMouthCornerIndex];
            } else if (face.scaledMesh) {
                // 旧版本API
                leftMouthCorner = {
                    x: face.scaledMesh[leftMouthCornerIndex][0],
                    y: face.scaledMesh[leftMouthCornerIndex][1]
                };
                rightMouthCorner = {
                    x: face.scaledMesh[rightMouthCornerIndex][0],
                    y: face.scaledMesh[rightMouthCornerIndex][1]
                };
            }

            if (leftMouthCorner && rightMouthCorner) {
                // 计算当前嘴角距离
                const currentMouthWidth = Math.hypot(
                    rightMouthCorner.x - leftMouthCorner.x,
                    rightMouthCorner.y - leftMouthCorner.y
                );
                
                // 初始化基准距离（第一次检测时）
                if (!initialMouthDistance) {
                    initialMouthDistance = currentMouthWidth;
                    console.log('📏 初始化嘴角基准距离:', initialMouthDistance.toFixed(2));
                }
                
                // 检查嘴角关键点距离变化（例如超过10%视为微笑）
                const smileRatio = (currentMouthWidth - initialMouthDistance) / initialMouthDistance;
                const isCurrentlySmiling = Math.abs(smileRatio) > 0.1; // 超过10%视为微笑
                
                console.log(`😊 微笑检测 - 当前距离: ${currentMouthWidth.toFixed(2)}, 基准: ${initialMouthDistance.toFixed(2)}, 变化比例: ${smileRatio.toFixed(3)}, 阈值: 0.1, 检测到微笑: ${isCurrentlySmiling}`);
                
                // 若武器为"微笑攻击"则调用 attackMonster() 扣除怪物血量
                const weaponSelect = document.getElementById('weaponSelect');
                const currentWeapon = weaponSelect ? weaponSelect.value : 'smile';
                
                if (currentWeapon === 'smile' && isCurrentlySmiling && !handGestureState) {
                    console.log('😄 检测到微笑！触发攻击');
                    handGestureState = true; // 避免重复触发
                    
                    // 调用 attackMonster() 扣除怪物血量
                    attackMonster('smile');
                    
                    // 设置冷却时间后重置状态
                    setTimeout(() => {
                        handGestureState = false;
                        console.log('😌 微笑攻击冷却结束');
                        // 重置基准距离，以便下次检测
                        initialMouthDistance = null;
                    }, 500); // 缩短冷却时间到0.5秒
                }
            } else {
                console.log('❌ 无法获取嘴角关键点');
            }
        } else {
            console.log('👤 未检测到人脸');
        }
        
    } catch (error) {
        console.error('微笑检测出错:', error);
    }
    
    // 使用 requestAnimationFrame(detectSmile) 持续检测
    requestAnimationFrame(detectSmile);
}

// 移除重复的复杂版startHandDetection函数，使用简化版startHandDetectionSimple替代

// 停止手部检测
function stopHandDetection() {
    return new Promise((resolve) => {
        handDetectionActive = false;
        
        if (hands && hands !== modelCache.hands) {
            try {
                hands.close();
                hands = null;
            } catch (error) {
                console.warn('关闭手部检测时出错:', error);
            }
        }
        
        // 等待一段时间确保资源完全释放
        setTimeout(() => {
            // 触发垃圾回收
            if (window.gc) {
                try {
                    window.gc();
                } catch (e) {
                    console.warn('手动触发垃圾回收失败:', e);
                }
            }
            resolve();
        }, 200);
    });
}

// 停止所有检测的函数
async function stopAllDetections() {
    console.log('停止所有检测...');
    
    // 停止微笑检测
    isDetectingSmile = false;
    isSmiling = false;
    initialMouthDistance = null;
    
    // 停止手部检测
    await stopHandDetection();
    
    // 清理相关状态
    isDetectingHands = false;
    handGestureState = false;
    lastWristY = null;
    lastWristX = null;
    
    console.log('所有检测已停止');
}

// 调试函数：测试摄像头状态
window.testCamera = async function() {
    console.log('=== 摄像头测试开始 ===');
    
    const videoElement = document.getElementById('video');
    if (!videoElement) {
        console.error('找不到video元素');
        return;
    }
    
    console.log('Video元素状态:', {
        存在: !!videoElement,
        显示: videoElement.style.display,
        可见性: videoElement.style.visibility,
        计算样式: {
            display: window.getComputedStyle(videoElement).display,
            visibility: window.getComputedStyle(videoElement).visibility,
            width: window.getComputedStyle(videoElement).width,
            height: window.getComputedStyle(videoElement).height
        },
        实际尺寸: {
            offsetWidth: videoElement.offsetWidth,
            offsetHeight: videoElement.offsetHeight,
            clientWidth: videoElement.clientWidth,
            clientHeight: videoElement.clientHeight
        },
        视频状态: {
            srcObject: !!videoElement.srcObject,
            readyState: videoElement.readyState,
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            paused: videoElement.paused,
            muted: videoElement.muted
        }
    });
    
    // 尝试启动摄像头
    try {
        await startCamera();
        console.log('摄像头启动成功');
        
        // 再次检查状态
        console.log('启动后的Video元素状态:', {
            srcObject: !!videoElement.srcObject,
            readyState: videoElement.readyState,
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            paused: videoElement.paused
        });
        
        if (videoElement.srcObject) {
            const tracks = videoElement.srcObject.getTracks();
            console.log('媒体流状态:', tracks.map(track => ({
                kind: track.kind,
                enabled: track.enabled,
                readyState: track.readyState,
                muted: track.muted
            })));
        }
        
    } catch (error) {
        console.error('摄像头启动失败:', error);
    }
    
    console.log('=== 摄像头测试结束 ===');
};



// 简化的摄像头启动函数，不包含ML检测以提高性能
async function startCameraSimple() {
    try {
        console.log('启动简化摄像头模式...');
        
        // 获取视频元素
        video = document.getElementById('video');
        if (!video) {
            throw new Error('找不到视频元素');
        }

        // 如果摄像头已经在运行，先停止当前流
        if (video.srcObject) {
            console.log('停止现有摄像头流');
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }

        // 检查浏览器支持
        if (!navigator.mediaDevices?.getUserMedia) {
            throw new Error('您的浏览器不支持摄像头访问，请使用最新版本的Chrome、Firefox或Edge浏览器。');
        }

        // 获取摄像头流（使用较低的分辨率以提高性能）
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 320 },
                height: { ideal: 240 },
                facingMode: 'user'
            }
        });

        // 绑定视频流
        video.srcObject = stream;
        
        // 等待视频加载
        await new Promise((resolve, reject) => {
            video.onloadeddata = resolve;
            video.onerror = () => reject(new Error('视频加载失败'));
            // 设置5秒超时
            const timeout = setTimeout(() => reject(new Error('视频加载超时')), 5000);
            // 如果视频已加载完成，直接解析
            if (video.readyState >= 2) {
                clearTimeout(timeout);
                resolve();
            }
        });

        // 开始播放视频
        await video.play();
        console.log('简化摄像头已启动');

        // 延迟初始化ML检测以避免性能问题
        setTimeout(() => {
            initMLDetectionDelayed();
        }, 2000);

        return true;
    } catch (error) {
        console.error('简化摄像头启动失败:', error);
        
        // 清理视频元素
        if (video && video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
        
        throw error;
    }
}

// 延迟初始化ML检测
async function initMLDetectionDelayed() {
    try {
        if (!video || !video.srcObject) {
            console.log('视频未准备好，跳过ML检测初始化');
            return;
        }

        console.log('延迟初始化ML检测...');
        
        // 根据当前武器类型初始化对应的检测
        if (currentWeapon === 'smile') {
            try {
                if (!faceMesh) {
                    await initFaceDetection();
                }
                isDetectingSmile = true;
                setTimeout(() => detectSmile(), 1000); // 延迟1秒开始检测
                console.log('面部检测已启动');
            } catch (error) {
                console.error('面部检测初始化失败:', error);
            }
        } else if (currentWeapon === 'wave') {
            try {
                isDetectingHands = true;
                        // 使用简化版启动函数，避免重复初始化
        setTimeout(() => startHandDetectionSimple(), 1000); // 延迟1秒开始检测
                console.log('手部检测已启动');
            } catch (error) {
                console.error('手部检测初始化失败:', error);
            }
        }
    } catch (error) {
        console.error('延迟ML检测初始化失败:', error);
    }
}

// 显示过渡提示卡片
function showTransitionTip() {
    console.log('显示过渡提示卡片');
    
    // 先隐藏所有页面
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('show');
        setTimeout(() => {
            page.style.display = 'none';
        }, 250);
    });
    
    // 短暂延迟后显示过渡提示页面
    setTimeout(() => {
        const transitionTip = document.getElementById('transitionTip');
        if (transitionTip) {
            transitionTip.style.display = 'block';
            // 强制重绘
            transitionTip.offsetHeight;
            // 添加显示类触发动画
            transitionTip.classList.add('show');
            console.log('过渡提示卡片已显示');
        } else {
            console.error('找不到过渡提示页面');
        }
    }, 250);
}

// 全局错误处理 - 特殊处理MediaPipe相关错误
window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error);
    
    // 特殊处理MediaPipe相关错误
    if (event.error && event.error.message && 
        (event.error.message.includes('BindingError') || 
         event.error.message.includes('WebAssembly') ||
         event.error.message.includes('Failed to execute') ||
         event.error.name === 'BindingError')) {
        console.warn('检测到MediaPipe WebAssembly错误，尝试重置模型缓存');
        // 重置模型缓存
        modelCache.hands = null;
        modelCache.isHandsInitialized = false;
        handDetectionActive = false;
        
        // 如果当前是挥手模式，切换到点击模式
        if (currentWeapon === 'wave') {
            currentWeapon = 'click';
            const weaponSelect = document.getElementById('weaponSelect');
            if (weaponSelect) {
                weaponSelect.value = 'click';
            }
            console.log('已自动切换到点击模式');
        }
    }
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的Promise拒绝:', event.reason);
    
    // 特殊处理MediaPipe相关错误
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('BindingError') || 
         event.reason.message.includes('WebAssembly') ||
         event.reason.message.includes('Failed to execute') ||
         event.reason.name === 'BindingError')) {
        console.warn('检测到MediaPipe Promise错误，尝试重置模型缓存');
        // 重置模型缓存
        modelCache.hands = null;
        modelCache.isHandsInitialized = false;
        handDetectionActive = false;
        
        // 如果当前是挥手模式，切换到点击模式
        if (currentWeapon === 'wave') {
            currentWeapon = 'click';
            const weaponSelect = document.getElementById('weaponSelect');
            if (weaponSelect) {
                weaponSelect.value = 'click';
            }
            console.log('已自动切换到点击模式');
        }
        
        // 防止错误继续传播
        event.preventDefault();
    }
});

// 页面切换函数