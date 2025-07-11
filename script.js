document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const commandInput = document.getElementById('command-input');
    const workingArea = document.getElementById('working-area');
    const stagingArea = document.getElementById('staging-area');
    const localRepo = document.getElementById('local-repo');
    const remoteRepo = document.getElementById('remote-repo');
    const notification = document.getElementById('notification');
    const suggestionsContainer = document.getElementById('suggestions');
    const currentDirElement = document.getElementById('current-dir');
    const localScenarioBtn = document.getElementById('local-scenario');
    const remoteScenarioBtn = document.getElementById('remote-scenario');
    const soundToggle = document.getElementById('sound-toggle');
    
    // State
    const state = {
        scenario: 'local',
        currentDir: '/',
        files: {},
        gitInitialized: false,
        commits: [],
        nextCommitId: 1,
        directories: [],
        cloned: false,
        soundEnabled: true
    };
    
    // Initialize view
    renderAreas();
    updateSuggestions();
    
    // Scenario switching
    localScenarioBtn.addEventListener('click', () => switchScenario('local'));
    remoteScenarioBtn.addEventListener('click', () => switchScenario('remote'));
    
    // Sound toggle
    soundToggle.addEventListener('click', function() {
        state.soundEnabled = !state.soundEnabled;
        soundToggle.classList.toggle('active', state.soundEnabled);
        soundToggle.innerHTML = state.soundEnabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    });
    
    // Command input handling
    commandInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const command = commandInput.value.trim();
            if (command) {
                processCommand(command);
                commandInput.value = '';
            }
        }
    });
    
    // Suggestion click handling
    suggestionsContainer.addEventListener('click', function(e) {
        if (e.target.classList.contains('suggestion')) {
            commandInput.value = e.target.textContent;
            commandInput.focus();
        }
    });
    
    // Switch between scenarios
    function switchScenario(scenario) {
        state.scenario = scenario;
        state.currentDir = '/';
        state.files = {};
        state.gitInitialized = false;
        state.commits = [];
        state.nextCommitId = 1;
        state.directories = [];
        state.cloned = false;
        
        // Update UI
        localScenarioBtn.classList.toggle('active', scenario === 'local');
        remoteScenarioBtn.classList.toggle('active', scenario === 'remote');
        renderAreas();
        updateCurrentDir();
        updateSuggestions();
        
        if (scenario === 'remote') {
            showNotification('Switched to remote repository scenario. Try "git clone https://github.com/example/repo.git"');
        } else {
            showNotification('Switched to local workflow scenario. Start by creating files with "touch filename"');
        }
    }
    
    // Process commands
    function processCommand(command) {
        const parts = command.split(' ');
        const cmd = parts[0].toLowerCase();
        
        switch (cmd) {
            case 'touch':
                if (parts.length < 2) {
                    showNotification('Usage: touch <filename>', true);
                    return;
                }
                createFile(parts[1]);
                break;
            case 'git':
                processGitCommand(parts.slice(1));
                break;
            default:
                showNotification(`Command not recognized: ${cmd}`, true);
        }
    }
    
    // Process Git commands
    function processGitCommand(parts) {
        if (parts.length === 0) {
            showNotification('Usage: git <command>', true);
            return;
        }
        
        const gitCmd = parts[0].toLowerCase();
        
        switch (gitCmd) {
            case 'init':
                gitInit();
                break;
            case 'add':
                if (parts.length < 2) {
                    showNotification('Usage: git add <filename|.>', true);
                    return;
                }
                const target = parts[1];
                if (target === '.') {
                    gitAddAll();
                } else {
                    gitAdd(target);
                }
                break;
            case 'commit':
                if (parts.length < 2 || parts[1] !== '-m') {
                    showNotification('Usage: git commit -m "commit message"', true);
                    return;
                }
                const message = parts.slice(2).join(' ').replace(/"/g, '');
                gitCommit(message);
                break;
            case 'push':
                gitPush();
                break;
            case 'clone':
                if (parts.length < 2) {
                    showNotification('Usage: git clone <repository-url>', true);
                    return;
                }
                gitClone(parts[1]);
                break;
            case 'restore':
                if (parts.length < 2) {
                    showNotification('Usage: git restore [--staged] <file>', true);
                    return;
                }
                
                if (parts[1] === '--staged') {
                    if (parts.length < 3) {
                        showNotification('Usage: git restore --staged <file>', true);
                        return;
                    }
                    gitRestoreStaged(parts[2]);
                } else {
                    gitRestore(parts[1]);
                }
                break;
            default:
                showNotification(`Git command not supported: ${gitCmd}`, true);
        }
    }
    
    // Linux commands
    function createFile(fileName) {
        if (state.files[fileName]) {
            showNotification(`File already exists: ${fileName}`, true);
            return;
        }
        
        state.files[fileName] = {
            staged: false,
            committed: false,
            pushed: false
        };
        
        // Create file in working area
        const file = document.createElement('div');
        file.className = 'file';
        file.textContent = fileName;
        workingArea.appendChild(file);
        
        // Remove empty state if needed
        if (workingArea.querySelector('.empty-state')) {
            workingArea.querySelector('.empty-state').remove();
        }
        
        animateElement(file);
        playSound('touch');
        showNotification(`Created file: ${fileName}`);
        
        updateSuggestions();
    }
    
    // Git commands
    function gitInit() {
        if (state.gitInitialized) {
            showNotification('Repository already initialized', true);
            return;
        }
        
        state.gitInitialized = true;
        
        // Add .git folder to working area
        const gitFolder = document.createElement('div');
        gitFolder.className = 'folder';
        gitFolder.innerHTML = '<i class="fas fa-folder"></i>.git';
        workingArea.appendChild(gitFolder);
        
        // Animation
        animateElement(gitFolder);
        playSound('init');
        showNotification('Initialized empty Git repository');
        
        updateSuggestions();
    }
    
    function gitAdd(fileName) {
        if (!state.gitInitialized) {
            showNotification('Please initialize repository with git init first', true);
            return;
        }
        
        if (!state.files[fileName]) {
            showNotification(`File not found: ${fileName}`, true);
            return;
        }
        
        if (state.files[fileName].staged) {
            showNotification(`File already staged: ${fileName}`, true);
            return;
        }
        
        // Update state
        state.files[fileName].staged = true;
        
        // Update view
        renderAreas();
        
        // Find the file element and animate it to staging area
        const files = workingArea.querySelectorAll('.file');
        let fileElement;
        
        for (let file of files) {
            if (file.textContent === fileName) {
                fileElement = file;
                break;
            }
        }
        
        if (fileElement) {
            animateMovement(fileElement, stagingArea);
            playSound('add');
            showNotification(`Added ${fileName} to staging area`);
        }
        
        updateSuggestions();
    }
    
    function gitAddAll() {
        if (!state.gitInitialized) {
            showNotification('Please initialize repository with git init first', true);
            return;
        }
        
        let addedCount = 0;
        
        for (const fileName in state.files) {
            if (!state.files[fileName].staged) {
                state.files[fileName].staged = true;
                addedCount++;
            }
        }
        
        if (addedCount === 0) {
            showNotification('No unstaged files to add', true);
            return;
        }
        
        // Update view
        renderAreas();
        
        // Animate all unstaged files to staging
        const files = workingArea.querySelectorAll('.file');
        files.forEach(file => {
            if (state.files[file.textContent] && state.files[file.textContent].staged) {
                animateMovement(file, stagingArea);
            }
        });
        
        playSound('add');
        showNotification(`Added ${addedCount} file(s) to staging area`);
        updateSuggestions();
    }
    
    function gitCommit(message) {
        if (!state.gitInitialized) {
            showNotification('Please initialize repository with git init first', true);
            return;
        }
        
        // Check if there are staged files
        const stagedFiles = Object.keys(state.files).filter(fileName => 
            state.files[fileName].staged && !state.files[fileName].committed
        );
        
        if (stagedFiles.length === 0) {
            showNotification('Nothing to commit (no files staged)', true);
            return;
        }
        
        if (!message) {
            showNotification('Please provide a commit message', true);
            return;
        }
        
        // Create commit
        const commitId = state.nextCommitId++;
        const commit = {
            id: commitId,
            message: message,
            files: stagedFiles,
            pushed: false
        };
        
        state.commits.push(commit);
        
        // Update file states
        stagedFiles.forEach(fileName => {
            state.files[fileName].staged = false;
            state.files[fileName].committed = true;
        });
        
        // Update view
        renderAreas();
        
        // Show notification
        playSound('commit');
        showNotification(`Committed changes: "${message}"`);
        
        // Animate files to local repo
        const files = stagingArea.querySelectorAll('.file');
        if (files.length > 0) {
            files.forEach(file => {
                animateMovement(file, localRepo);
            });
        }
        
        updateSuggestions();
    }
    
    function gitPush() {
        if (!state.gitInitialized) {
            showNotification('Please initialize repository with git init first', true);
            return;
        }
        
        if (!state.cloned && state.scenario === 'remote') {
            showNotification('Please clone a repository first or switch to local scenario', true);
            return;
        }
        
        // Find unpushed commits
        const unpushedCommits = state.commits.filter(commit => !commit.pushed);
        
        if (unpushedCommits.length === 0) {
            showNotification('Nothing to push (all commits are up to date)', true);
            return;
        }
        
        // Mark commits as pushed
        unpushedCommits.forEach(commit => commit.pushed = true);
        
        // Update file states
        unpushedCommits.forEach(commit => {
            commit.files.forEach(fileName => {
                if (state.files[fileName]) {
                    state.files[fileName].pushed = true;
                }
            });
        });
        
        // Update view
        renderAreas();
        
        // Show notification
        playSound('push');
        showNotification(`Pushed ${unpushedCommits.length} commit(s) to remote repository`);
        
        // Animate commits to remote repo
        const commits = localRepo.querySelectorAll('.commit');
        if (commits.length > 0) {
            commits.forEach(commit => {
                animateMovement(commit, remoteRepo);
            });
        }
        
        updateSuggestions();
    }
    
    function gitClone(url) {
        if (state.gitInitialized) {
            showNotification('Repository already exists. Please switch scenario to start fresh', true);
            return;
        }
        
        if (!url.includes('github.com') && !url.includes('gitlab.com') && !url.includes('bitbucket.org')) {
            showNotification('Please provide a valid Git repository URL', true);
            return;
        }
        
        state.gitInitialized = true;
        state.cloned = true;
        
        // Add .git folder to working area
        const gitFolder = document.createElement('div');
        gitFolder.className = 'folder';
        gitFolder.innerHTML = '<i class="fas fa-folder"></i>.git';
        workingArea.appendChild(gitFolder);
        
        // Add demo files
        const demoFiles = ['README.md', 'index.html', 'styles.css', 'app.js'];
        demoFiles.forEach(fileName => {
            state.files[fileName] = {
                staged: false,
                committed: true,
                pushed: true
            };
            
            const fileElement = document.createElement('div');
            fileElement.className = 'file';
            fileElement.textContent = fileName;
            workingArea.appendChild(fileElement);
        });
        
        // Create a commit
        state.commits.push({
            id: state.nextCommitId++,
            message: 'Initial commit',
            files: demoFiles,
            pushed: true
        });
        
        // Update view
        renderAreas();
        
        // Animation
        animateElement(gitFolder);
        playSound('init');
        showNotification(`Cloned repository from ${url}`);
        
        updateSuggestions();
    }
    
    function gitRestore(fileName) {
        if (!state.gitInitialized) {
            showNotification('Please initialize repository with git init first', true);
            return;
        }
        
        if (!state.files[fileName]) {
            showNotification(`File not found: ${fileName}`, true);
            return;
        }
        
        // For untracked files (never committed)
        if (!state.files[fileName].committed) {
            delete state.files[fileName];
            renderAreas();
            showNotification(`Deleted untracked file: ${fileName}`);
            return;
        }
        
        // For tracked files
        if (state.files[fileName].staged) {
            state.files[fileName].staged = false;
        }
        
        renderAreas();
        playSound('error');
        showNotification(`Reverted changes to: ${fileName}`);
    }
    
    function gitRestoreStaged(fileName) {
        if (!state.gitInitialized) {
            showNotification('Please initialize repository with git init first', true);
            return;
        }
        
        if (!state.files[fileName]) {
            showNotification(`File not found: ${fileName}`, true);
            return;
        }
        
        if (!state.files[fileName].staged) {
            showNotification(`File is not staged: ${fileName}`, true);
            return;
        }
        
        state.files[fileName].staged = false;
        renderAreas();
        playSound('error');
        showNotification(`Unstaged: ${fileName}`);
    }
    
    // Render all areas based on state
    function renderAreas() {
        renderWorkingArea();
        renderStagingArea();
        renderLocalRepo();
        renderRemoteRepo();
    }
    
    function renderWorkingArea() {
        workingArea.innerHTML = '';
        
        // Add .git folder if initialized
        if (state.gitInitialized) {
            const gitFolder = document.createElement('div');
            gitFolder.className = 'folder';
            gitFolder.innerHTML = '<i class="fas fa-folder"></i>.git';
            workingArea.appendChild(gitFolder);
        }
        
        // Add files
        for (const fileName in state.files) {
            if (!state.files[fileName].staged) {
                const fileElement = document.createElement('div');
                fileElement.className = 'file';
                fileElement.textContent = fileName;
                workingArea.appendChild(fileElement);
            }
        }
        
        // Show empty state if needed
        if (workingArea.children.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = 'No files yet';
            workingArea.appendChild(emptyState);
        }
    }
    
    function renderStagingArea() {
        stagingArea.innerHTML = '';
        
        const stagedFiles = Object.keys(state.files).filter(fileName => 
            state.files[fileName].staged
        );
        
        if (stagedFiles.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = 'No files staged';
            stagingArea.appendChild(emptyState);
            return;
        }
        
        stagedFiles.forEach(fileName => {
            const fileElement = document.createElement('div');
            fileElement.className = 'file';
            fileElement.textContent = fileName;
            stagingArea.appendChild(fileElement);
        });
    }
    
    function renderLocalRepo() {
        localRepo.innerHTML = '';
        
        const localCommits = state.commits.filter(commit => !commit.pushed);
        
        if (localCommits.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = 'No commits yet';
            localRepo.appendChild(emptyState);
            return;
        }
        
        localCommits.forEach(commit => {
            const commitElement = createCommitElement(commit);
            localRepo.appendChild(commitElement);
        });
    }
    
    function renderRemoteRepo() {
        remoteRepo.innerHTML = '';
        
        const remoteCommits = state.commits.filter(commit => commit.pushed);
        
        if (remoteCommits.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.textContent = 'No pushed commits';
            remoteRepo.appendChild(emptyState);
            return;
        }
        
        remoteCommits.forEach(commit => {
            const commitElement = createCommitElement(commit);
            remoteRepo.appendChild(commitElement);
        });
    }
    
    function createCommitElement(commit) {
        const commitElement = document.createElement('div');
        commitElement.className = 'commit';
        
        commitElement.innerHTML = `
            <div class="commit-header">
                <span>Commit ${commit.id}</span>
                <span class="commit-id">#${commit.id.toString().padStart(6, '0')}</span>
            </div>
            <div class="commit-message">${commit.message}</div>
            <div class="commit-files">
                ${commit.files.map(file => `<span>${file}</span>`).join(', ')}
            </div>
        `;
        
        return commitElement;
    }
    
    // Update command suggestions based on current state
    function updateSuggestions() {
        suggestionsContainer.innerHTML = '';
        
        // Always show basic commands
        addSuggestion('touch file.txt');
        
        if (!state.gitInitialized) {
            addSuggestion('git init');
        } else {
            // Git is initialized
            const unstagedFiles = Object.keys(state.files).filter(fileName => !state.files[fileName].staged);
            const stagedFiles = Object.keys(state.files).filter(fileName => state.files[fileName].staged);
            const unpushedCommits = state.commits.filter(commit => !commit.pushed);
            
            if (unstagedFiles.length > 0) {
                addSuggestion('git add .');
                addSuggestion(`git add ${unstagedFiles[0]}`);
            }
            
            if (stagedFiles.length > 0) {
                addSuggestion('git commit -m "Your message"');
                addSuggestion(`git restore --staged ${stagedFiles[0]}`);
            }
            
            if (unpushedCommits.length > 0) {
                addSuggestion('git push');
            }
            
            if (state.scenario === 'remote' && !state.cloned) {
                addSuggestion('git clone https://github.com/example/repo.git');
            }
        }
        
        // If no suggestions, show help
        if (suggestionsContainer.children.length === 0) {
            addSuggestion('touch README.md');
            addSuggestion('git init');
        }
    }
    
    function addSuggestion(text) {
        const suggestion = document.createElement('div');
        suggestion.className = 'suggestion';
        suggestion.textContent = text;
        suggestionsContainer.appendChild(suggestion);
    }
    
    // Update current directory display
    function updateCurrentDir() {
        currentDirElement.textContent = state.currentDir;
    }
    
    // Animation functions
    function animateElement(element) {
        element.style.transform = 'scale(1.1)';
        element.style.boxShadow = '0 0 15px rgba(100, 255, 218, 0.6)';
        
        setTimeout(() => {
            element.style.transform = 'scale(1)';
            element.style.boxShadow = '';
        }, 500);
    }
    
    function animateMovement(element, targetArea) {
        const clone = element.cloneNode(true);
        clone.style.position = 'absolute';
        clone.style.top = `${element.getBoundingClientRect().top}px`;
        clone.style.left = `${element.getBoundingClientRect().left}px`;
        clone.style.width = `${element.offsetWidth}px`;
        clone.style.zIndex = '1000';
        clone.style.pointerEvents = 'none';
        
        document.body.appendChild(clone);
        
        const targetRect = targetArea.getBoundingClientRect();
        const targetX = targetRect.left + targetRect.width / 2;
        const targetY = targetRect.top + targetRect.height / 2;
        
        clone.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        clone.style.transform = `translate(${targetX - clone.getBoundingClientRect().left}px, ${targetY - clone.getBoundingClientRect().top}px) scale(0.8)`;
        clone.style.opacity = '0.7';
        
        setTimeout(() => {
            clone.remove();
        }, 800);
    }
    
    function showNotification(message, isError = false) {
        notification.textContent = message;
        notification.style.borderColor = isError ? '#f44336' : '#64ffda';
        notification.style.color = isError ? '#ffcdd2' : '#e6e6e6';
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // Sound functions
    function playSound(type) {
        if (!state.soundEnabled) return;
        
        // Create audio context for sound effects
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        const frequencies = {
            'touch': 440,
            'init': 523,
            'add': 659,
            'commit': 784,
            'push': 880,
            'error': 220
        };
        
        oscillator.frequency.setValueAtTime(frequencies[type] || 440, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
    }
    
    // Enhanced sound system
    const soundThemes = {
        retro: {
            touch: [440, 0.1],
            init: [523, 0.2],
            add: [659, 0.15],
            commit: [784, 0.3],
            push: [880, 0.25],
            error: [220, 0.2],
            achievement: [1047, 0.5]
        },
        modern: {
            touch: [800, 0.05],
            init: [600, 0.1],
            add: [700, 0.08],
            commit: [900, 0.15],
            push: [1000, 0.12],
            error: [300, 0.15],
            achievement: [1200, 0.3]
        }
    };

    function playEnhancedSound(type, theme = 'retro') {
        if (!state.soundEnabled) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const [frequency, duration] = soundThemes[theme][type] || [440, 0.1];
            
            // Create more complex sound with effects
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
            oscillator.type = type === 'error' ? 'sawtooth' : 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + duration);
        } catch (error) {
            // Fallback to original sound function
            playSound(type);
        }
    }
    
    // Initialize with a welcome message
    setTimeout(() => {
        showNotification('Welcome! Start by creating files with "touch filename"');
    }, 1000);
    
    // Achievement notification
    function notifyAchievement(id) {
        const achievement = achievements[id];
        if (!achievement) return;
        
        // Create achievement element
        const achievementElement = document.createElement('div');
        achievementElement.className = 'notification achievement';
        achievementElement.innerHTML = `
            <span class="achievement-icon">${achievement.icon}</span>
            <span class="achievement-title">${achievement.title}</span>
            <span class="achievement-description">${achievement.description}</span>
        `;
        
        document.body.appendChild(achievementElement);
        
        // Animation
        animateElement(achievementElement);
        playSound('achievement');
        
        setTimeout(() => achievementElement.remove(), 4000);
    }
    
    // Stats tracking functions
    function updateStats(commandType) {
        state.stats.commandsExecuted++;
        
        switch (commandType) {
            case 'touch':
                state.stats.filesCreated++;
                break;
            case 'commit':
                state.stats.commitsCreated++;
                break;
            case 'push':
                state.stats.pushesCompleted++;
                break;
        }
        
        updateStatsDisplay();
        checkAchievements();
    }

    function createStatsPanel() {
        const statsPanel = document.createElement('div');
        statsPanel.className = 'stats-panel';
        statsPanel.innerHTML = `
            <h3>📊 Your Progress</h3>
            <div class="stat-item">
                <span>Commands: </span>
                <span id="stat-commands">0</span>
            </div>
            <div class="stat-item">
                <span>Files Created: </span>
                <span id="stat-files">0</span>
            </div>
            <div class="stat-item">
                <span>Commits: </span>
                <span id="stat-commits">0</span>
            </div>
            <div class="stat-item">
                <span>Pushes: </span>
                <span id="stat-pushes">0</span>
            </div>
            <div class="achievements-preview">
                <h4>🏆 Achievements (${state.achievements.length})</h4>
                <div id="achievement-badges"></div>
            </div>
        `;
        
        document.querySelector('.container').appendChild(statsPanel);
    }

    function updateStatsDisplay() {
        const statCommands = document.getElementById('stat-commands');
        const statFiles = document.getElementById('stat-files');
        const statCommits = document.getElementById('stat-commits');
        const statPushes = document.getElementById('stat-pushes');
        
        if (statCommands) statCommands.textContent = state.stats.commandsExecuted;
        if (statFiles) statFiles.textContent = state.stats.filesCreated;
        if (statCommits) statCommits.textContent = state.stats.commitsCreated;
        if (statPushes) statPushes.textContent = state.stats.pushesCompleted;
        
        // Update achievement count
        const achievementCount = document.querySelector('.achievements-preview h4');
        if (achievementCount) {
            achievementCount.textContent = `🏆 Achievements (${state.achievements.length})`;
        }
        
        // Update achievement badges
        const badgesContainer = document.getElementById('achievement-badges');
        if (badgesContainer) {
            badgesContainer.innerHTML = state.achievements.map(id => 
                `<span class="achievement-badge" title="${achievements[id].title}">${achievements[id].icon}</span>`
            ).join('');
        }
    }
});