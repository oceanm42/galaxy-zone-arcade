document.addEventListener('DOMContentLoaded', () => {
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
        card.style.animation = 'fadeInUp 0.5s ease forwards';
        card.style.opacity = '0';
    });

    gameCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            playHoverSound();
        });
    });

    const playHoverSound = () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 440;
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    };

    const coinText = document.querySelector('.coin-text');
    let coinInserted = false;
    
    coinText.addEventListener('click', () => {
        if (!coinInserted) {
            coinText.textContent = 'Coin Inserted! Ready Player One!';
            coinText.style.color = '#00FF00';
            coinInserted = true;
            
            playCoinSound();
            
            setTimeout(() => {
                coinText.textContent = 'Insert Coin to Continue...';
                coinText.style.color = '';
                coinInserted = false;
            }, 3000);
        }
    });

    const playCoinSound = () => {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.2);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && e.target.classList.contains('game-card')) {
            e.target.click();
        }
    };

    document.addEventListener('keydown', handleKeyPress);
});

const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);