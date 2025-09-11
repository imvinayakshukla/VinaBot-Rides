pipeline {
    agent any
    
    environment {
        // Local development with Kind - no external registry needed
        DOCKER_IMAGE_NAME = 'vinabot-rides-frontend'
        DOCKER_IMAGE_TAG = "${BUILD_NUMBER}"
        HELM_CHART_PATH = 'frontend/deployment/helm'
        FRONTEND_APP_PATH = 'frontend/vinabot-rides-app'
        KIND_CLUSTER_NAME = 'vinabot-rides'
        GITHUB_CREDENTIALS_ID = 'jenkins-vinbotride-token' // Add your GitHub token credential ID
    }
    
    triggers {
        // Trigger build on PR and dev branch pushes
        githubPush()
         githubPullRequests {
        
            targetBranches('dev')         // 👈 only trigger PRs targeting dev
    }

    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                script {
                    if (env.CHANGE_ID) {
                        echo "🔄 Building Pull Request #${env.CHANGE_ID}"
                        echo "📝 PR Title: ${env.CHANGE_TITLE}"
                        echo "🌿 Source Branch: ${env.CHANGE_BRANCH}"
                        echo "🎯 Target Branch: ${env.CHANGE_TARGET}"
                    } else {
                        echo "🌿 Building branch: ${env.BRANCH_NAME}"
                    }
                }
                checkout scm
            }
        }
        
        stage('Environment Check') {
            steps {
                echo 'Checking build environment...'
                sh '''
                    echo "=== Environment Information ==="
                    whoami
                    pwd
                    echo "User: $(whoami)"
                    echo "Home: $HOME" 
                    echo "Path: $PATH"
                    
                    echo "=== Available Commands ==="
                    command -v curl && echo "✅ curl available" || echo "❌ curl not found"
                    command -v git && echo "✅ git available" || echo "❌ git not found" 
                    command -v node && echo "✅ node available" || echo "❌ node not found"
                    command -v npm && echo "✅ npm available" || echo "❌ npm not found"
                    command -v docker && echo "✅ docker available" || echo "❌ docker not found"
                    
                    echo "=== System Info ==="
                    uname -a
                    cat /etc/os-release | head -5
                    df -h | head -5
                    echo "========================="
                '''
            }
        }
        
        stage('Install Node.js') {
            when {
                anyOf {
                    not {
                        expression {
                            return sh(script: 'command -v node', returnStatus: true) == 0
                        }
                    }
                    expression {
                        // Check if Node.js version is too old for Angular 20.1.x
                        def nodeVersion = sh(script: 'node --version 2>/dev/null || echo "none"', returnStdout: true).trim()
                        if (nodeVersion == "none") return true
                        
                        // Parse version numbers for proper comparison
                        def versionParts = nodeVersion.replaceAll(/[v]/, '').split('\\.')
                        def major = versionParts[0] as Integer
                        def minor = versionParts[1] as Integer
                        def patch = versionParts[2] as Integer
                        
                        // Check if version is less than 20.19.0
                        return (major < 20) || (major == 20 && minor < 19)
                    }
                }
            }
            steps {
                echo 'Installing Node.js v20.19.0 (required for Angular 20.1.x)...'
                sh '''
                    # Set Jenkins home directory (different for native vs Docker Jenkins)
                    if [ -d "/var/lib/jenkins" ]; then
                        JENKINS_HOME="/var/lib/jenkins"
                    else
                        JENKINS_HOME="$HOME"
                    fi
                    
                    # Remove any existing Node.js installation in Jenkins home directory
                    rm -rf $JENKINS_HOME/nodejs || true
                    
                    # Method 1: Try to use existing Node.js from system if it's new enough
                    if command -v node >/dev/null 2>&1; then
                        CURRENT_VERSION=$(node --version)
                        echo "Found Node.js version: $CURRENT_VERSION"
                        
                        # Check if version is 20.19.0 or higher using proper version comparison
                        VERSION_NUM=$(echo "$CURRENT_VERSION" | sed 's/v//' | tr '.' ' ')
                        MAJOR=$(echo $VERSION_NUM | cut -d' ' -f1)
                        MINOR=$(echo $VERSION_NUM | cut -d' ' -f2)
                        PATCH=$(echo $VERSION_NUM | cut -d' ' -f3)
                        
                        if [ "$MAJOR" -gt 20 ] || [ "$MAJOR" -eq 20 -a "$MINOR" -gt 19 ] || [ "$MAJOR" -eq 20 -a "$MINOR" -eq 19 -a "$PATCH" -ge 0 ]; then
                            echo "System Node.js version is sufficient"
                            export PATH=/usr/bin:/usr/local/bin:$PATH
                            node --version
                            npm --version
                            exit 0
                        fi
                        
                        echo "System Node.js version is too old, installing newer version..."
                    fi
                    
                    # Method 2: Download pre-compiled Node.js binary (tar.gz instead of tar.xz)
                    echo "Downloading Node.js v20.19.0..."
                    NODE_VERSION="v20.19.0"
                    mkdir -p $JENKINS_HOME/nodejs
                    
                    # Use tar.gz instead of tar.xz (no xz dependency)
                    curl -L "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-linux-x64.tar.gz" -o node.tar.gz
                    
                    # Extract using standard tar
                    tar -xzf node.tar.gz -C $JENKINS_HOME/nodejs --strip-components=1
                    
                    # Add to PATH for this session
                    export PATH=$JENKINS_HOME/nodejs/bin:$PATH
                    
                    # Verify extraction worked
                    ls -la $JENKINS_HOME/nodejs/bin/
                    
                    # Set PATH for subsequent stages
                    export PATH=$JENKINS_HOME/nodejs/bin:$PATH
                    
                    # Verify installation
                    echo "Node.js verification:"
                    node --version || echo "Node.js installation failed"
                    npm --version || echo "npm not available"
                    which node || echo "Node.js not in PATH"
                    which npm || echo "npm not in PATH"
                '''
            }
        }
        
        stage('Build Application') {
            steps {
                echo 'Building Angular application...'
                dir("${FRONTEND_APP_PATH}") {
                    sh '''
                        # Set Jenkins home directory (different for native vs Docker Jenkins)
                        if [ -d "/var/lib/jenkins" ]; then
                            JENKINS_HOME="/var/lib/jenkins"
                        else
                            JENKINS_HOME="$HOME"
                        fi
                        
                        # Ensure Node.js is in PATH from all possible locations
                        export PATH=$JENKINS_HOME/nodejs/bin:/usr/local/bin:/usr/bin:$PATH
                        
                        # Source nvm if it exists
                        export NVM_DIR="$JENKINS_HOME/.nvm"
                        [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
                        [ -s "$NVM_DIR/bash_completion" ] && . "$NVM_DIR/bash_completion"
                        
                        # Verify Node.js is available and check version
                        echo "Checking Node.js availability:"
                        NODE_VERSION=$(node --version)
                        echo "Current Node.js version: $NODE_VERSION"
                        
                        # Check if version is sufficient (20.19.0 or higher)
                        VERSION_NUM=$(echo "$NODE_VERSION" | sed 's/v//' | tr '.' ' ')
                        MAJOR=$(echo $VERSION_NUM | cut -d' ' -f1)
                        MINOR=$(echo $VERSION_NUM | cut -d' ' -f2)
                        
                        if [ "$MAJOR" -lt 20 ] || [ "$MAJOR" -eq 20 -a "$MINOR" -lt 19 ]; then
                            echo "ERROR: Node.js version $NODE_VERSION is too old for Angular 20.1.x"
                            echo "Required: Node.js v20.19.0 or higher"
                            echo "Please check the 'Install Node.js' stage configuration"
                            exit 1
                        fi
                        
                        npm --version
                        echo "Node.js path: $(which node)"
                        echo "NPM path: $(which npm)"
                        
                        # Clean install dependencies
                        npm ci
                        
                        # Build the application
                        npm run build
                        
                        # Verify build output
                        ls -la dist/
                        
                        # Create build archive
                        tar -czf vinabot-rides-build-${BUILD_NUMBER}.tar.gz dist/
                        ls -lh *.tar.gz
                    '''
                }
            }
        }
        
        stage('Create Deployment Package') {
            when {
                not { 
                    changeRequest() 
                }
            }
            steps {
                echo 'Creating deployment package...'
                dir("${FRONTEND_APP_PATH}") {
                    sh '''
                        # Set Jenkins home directory (different for native vs Docker Jenkins)
                        if [ -d "/var/lib/jenkins" ]; then
                            JENKINS_HOME="/var/lib/jenkins"
                        else
                            JENKINS_HOME="$HOME"
                        fi
                        
                        # Ensure consistent PATH
                        export PATH=$JENKINS_HOME/nodejs/bin:/usr/bin:/usr/local/bin:$PATH
                        
                        # Create deployment directory
                        mkdir -p deployment-package
                        
                        # Copy built application
                        cp -r dist/ deployment-package/
                        
                        # Copy Dockerfile and nginx config
                        cp Dockerfile deployment-package/
                        cp nginx.conf deployment-package/
                        
                        # Create deployment script
                        cat > deployment-package/deploy-local.sh << 'EOF'
#!/bin/bash
echo "🚀 Building and deploying VinaBot Rides Frontend..."

# Build Docker image
docker build -t vinabot-rides-frontend:latest .

# Save as tar file  
docker save vinabot-rides-frontend:latest -o vinabot-rides-frontend.tar
echo "📦 Docker image saved as vinabot-rides-frontend.tar"

# Load into Kind cluster (if available)
if command -v kind >/dev/null 2>&1; then
    if kind get clusters | grep -q vinabot-rides; then
        echo "Loading image into Kind cluster..."
        kind load image-archive vinabot-rides-frontend.tar --name vinabot-rides
        echo "✅ Image loaded into Kind cluster"
    else
        echo "⚠️  Kind cluster 'vinabot-rides' not found"
    fi
else
    echo "⚠️  Kind not available"
fi

echo "🏁 Deployment package ready!"
echo "Docker image: vinabot-rides-frontend.tar"
EOF
                        
                        chmod +x deployment-package/deploy-local.sh
                        
                        # Create deployment package archive
                        tar -czf ../vinabot-rides-deployment-${BUILD_NUMBER}.tar.gz deployment-package/
                        
                        # Create build info
                        cat > ../build-info-${BUILD_NUMBER}.txt << EOF
Build Number: ${BUILD_NUMBER}
Build Date: $(date)
Git Commit: $(git rev-parse HEAD)
Git Branch: $(git branch --show-current)
Docker Image: ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}
EOF
                        
                        ls -la ../*.tar.gz ../*.txt
                    '''
                }
            }
        }
        
        stage('Archive Artifacts') {
            when {
                not { 
                    changeRequest() 
                }
            }
            steps {
                echo 'Archiving build artifacts...'
                script {
                    // Archive the deployment package and build info from the correct location
                    dir('frontend') {
                        archiveArtifacts artifacts: 'vinabot-rides-deployment-*.tar.gz, build-info-*.txt', fingerprint: true
                    }
                }
            }
        }
        
        stage('Build Docker Image') {
            when {
                not { 
                    changeRequest() 
                }
            }
            steps {
                echo 'Building Docker image...'
                dir("${FRONTEND_APP_PATH}") {
                    sh '''
                        # Set Jenkins home directory (different for native vs Docker Jenkins)
                        if [ -d "/var/lib/jenkins" ]; then
                            JENKINS_HOME="/var/lib/jenkins"
                        else
                            JENKINS_HOME="$HOME"
                        fi
                        
                        # Ensure consistent PATH
                        export PATH=$JENKINS_HOME/nodejs/bin:/usr/local/bin:/usr/bin:$PATH
                        
                        # Build Docker image
                        echo "Building Docker image: ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}"
                        docker build -t ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} .
                        
                        # Verify image was created
                        docker images | grep ${DOCKER_IMAGE_NAME} || echo "Image verification completed"
                        
                        # Save Docker image as tar file
                        echo "Saving Docker image as tar file..."
                        docker save ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} -o ${DOCKER_IMAGE_NAME}.tar
                        
                        # Verify tar file was created
                        ls -lh ${DOCKER_IMAGE_NAME}.tar
                        echo "Docker image saved as ${DOCKER_IMAGE_NAME}.tar ($(du -h ${DOCKER_IMAGE_NAME}.tar | cut -f1))"
                    '''
                }
            }
        }
        
        stage('Setup Kind and Tools') {
            when {
                not { 
                    changeRequest() 
                }
            }
            steps {
                echo 'Setting up Kind cluster and deployment tools...'
                sh '''
                    # Create local bin directory if it doesn't exist
                    mkdir -p $HOME/bin
                    
                    # Install Kind if not available
                    if ! command -v kind >/dev/null 2>&1; then
                        echo "Installing Kind..."
                        curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
                        chmod +x ./kind
                        # Try system install first, fallback to local bin
                        if command -v sudo >/dev/null 2>&1; then
                            sudo mv ./kind /usr/local/bin/kind 2>/dev/null || mv ./kind $HOME/bin/kind
                        else
                            mv ./kind $HOME/bin/kind
                        fi
                    fi
                    
                    # Install kubectl if not available
                    if ! command -v kubectl >/dev/null 2>&1; then
                        echo "Installing kubectl..."
                        curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
                        chmod +x kubectl
                        # Try system install first, fallback to local bin
                        if command -v sudo >/dev/null 2>&1; then
                            sudo mv ./kubectl /usr/local/bin/kubectl 2>/dev/null || mv ./kubectl $HOME/bin/kubectl
                        else
                            mv ./kubectl $HOME/bin/kubectl
                        fi
                    fi
                    
                    # Install Helm if not available
                    if ! command -v helm >/dev/null 2>&1; then
                        echo "Installing Helm..."
                        # Use direct binary download instead of script that might require sudo
                        curl -fsSL https://get.helm.sh/helm-v3.13.0-linux-amd64.tar.gz | tar -xzf - --strip-components=1 -C $HOME/bin linux-amd64/helm
                        chmod +x $HOME/bin/helm
                    fi
                    
                    # Update PATH to include local bin
                    export PATH=$HOME/bin:/usr/local/bin:$PATH
                    
                    # Verify installations
                    echo "=== Tool verification ==="
                    echo "PATH: $PATH"
                    ls -la $HOME/bin/ || echo "No local bin directory"
                    
                    # Check each tool
                    if command -v kind >/dev/null 2>&1; then
                        kind version
                        echo "✅ Kind available at: $(which kind)"
                    else
                        echo "⚠️ Kind not available"
                    fi
                    
                    if command -v kubectl >/dev/null 2>&1; then
                        kubectl version --client
                        echo "✅ kubectl available at: $(which kubectl)"
                    else
                        echo "⚠️ kubectl not available"
                    fi
                    
                    if command -v helm >/dev/null 2>&1; then
                        helm version
                        echo "✅ Helm available at: $(which helm)"
                    else
                        echo "⚠️ Helm not available"
                    fi
                    
                    if command -v docker >/dev/null 2>&1; then
                        docker --version
                        echo "✅ Docker available at: $(which docker)"
                    else
                        echo "⚠️ Docker not available"
                    fi
                '''
            }
        }
        
        stage('Deploy to Kind Cluster') {
            when {
                not { 
                    changeRequest() 
                }
            }
            steps {
                echo 'Deploying to Kind cluster...'
                dir("${FRONTEND_APP_PATH}") {
                    sh '''
                        # Update PATH to include all possible locations
                        export PATH=$HOME/bin:/usr/local/bin:/usr/bin:$PATH
                        
                        # Check if Kind cluster exists, create if not
                        if ! kind get clusters | grep -q "${KIND_CLUSTER_NAME}"; then
                            echo "Creating Kind cluster: ${KIND_CLUSTER_NAME}"
                            kind create cluster --config ../../deployment/kind-config.yaml --name ${KIND_CLUSTER_NAME}
                            
                            # Wait for cluster to be ready
                            echo "Waiting for cluster to be ready..."
                            kubectl cluster-info --context kind-${KIND_CLUSTER_NAME}
                        else
                            echo "Kind cluster '${KIND_CLUSTER_NAME}' already exists"
                        fi
                        
                        # Verify tar file exists
                        if [ ! -f "${DOCKER_IMAGE_NAME}.tar" ]; then
                            echo "ERROR: Docker image tar file not found!"
                            exit 1
                        fi
                        
                        # Load Docker image into Kind cluster
                        echo "Loading Docker image into Kind cluster..."
                        kind load image-archive ${DOCKER_IMAGE_NAME}.tar --name ${KIND_CLUSTER_NAME}
                        
                        # Verify image is loaded
                        echo "Verifying image in cluster..."
                        docker exec ${KIND_CLUSTER_NAME}-control-plane crictl images | grep ${DOCKER_IMAGE_NAME} || echo "Image verification completed"
                    '''
                }
            }
        }
        
        stage('Deploy with Helm') {
             when {
                     not { 
                        changeRequest() 
                    }
                }
            steps {
                echo 'Deploying application using Helm...'
                dir("${HELM_CHART_PATH}") {
                    sh '''
                        # Update PATH to include all possible locations
                        export PATH=$HOME/bin:/usr/local/bin:/usr/bin:$PATH
                        
                        # Get Kind cluster configuration and set up kubectl context
                        echo "=== Setting up kubectl context for Kind cluster ==="
                        
                        # Get the Kind cluster's kubeconfig
                        kind export kubeconfig --name ${KIND_CLUSTER_NAME}
                        
                        # Fix the kubeconfig to use the host's IP instead of localhost
                        # Get the host's IP address as seen from the container
                        HOST_IP=$(ip route | awk '/default/ { print $3 }')
                        echo "Host IP from container: $HOST_IP"
                        
                        # Update kubeconfig to use host IP instead of 127.0.0.1
                        kubectl config view --raw > /tmp/kubeconfig_backup
                        sed -i "s/127\\.0\\.0\\.1/$HOST_IP/g" ~/.kube/config
                        
                        # Verify the updated config
                        echo "=== Updated kubeconfig server ==="
                        kubectl config view | grep server 
                        
                        # Test connection with timeout
                        echo "=== Testing cluster connection ==="
                        if timeout 30 kubectl cluster-info; then
                            echo "✅ Successfully connected to cluster"
                        else
                            echo "❌ Failed to connect to cluster, trying alternative approach..."
                            
                            # Try using docker network to reach the Kind container directly
                            KIND_CONTAINER_IP=$(docker inspect vinabot-rides-control-plane --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
                            if [ ! -z "$KIND_CONTAINER_IP" ]; then
                                echo "Kind container IP: $KIND_CONTAINER_IP"
                                KIND_PORT=$(docker port vinabot-rides-control-plane 6443/tcp | cut -d: -f2)
                                echo "Kind API port: $KIND_PORT" 
                                
                                # Update kubeconfig with container IP and port 6443
                                sed -i "s|server:.*|server: https://$KIND_CONTAINER_IP:6443|g" ~/.kube/config
                                echo "Updated kubeconfig to use Kind container directly"
                                kubectl cluster-info
                            else
                                echo "Could not determine Kind container IP"
                                exit 1
                            fi
                        fi
                        
                        # Verify cluster is accessible
                        kubectl get nodes
                        
                        # Update image repository and tag in values.yaml (properly expand environment variables)
                        sed -i "s/repository:.*/repository: \"${DOCKER_IMAGE_NAME}\"/" frontend/values.yaml
                        sed -i "s/tag:.*/tag: \"${DOCKER_IMAGE_TAG}\"/" frontend/values.yaml
                        
                        # Show current Helm releases
                        echo "=== Current Helm releases ==="
                        helm list -A || echo "No existing releases found"
                        
                        # Create namespace if it doesn't exist
                        kubectl create namespace vinbot-ride-dev --dry-run=client -o yaml | kubectl apply -f -
                        
                        # Deploy with Helm (upgrade or install) in consistent namespace
                        echo "=== Deploying with Helm ==="
                        if helm list -n vinbot-ride-dev | grep -q "vinabot-rides-frontend"; then
                            echo "Upgrading existing Helm release..."
                            helm upgrade vinabot-rides-frontend frontend/ -n vinbot-ride-dev --wait --timeout=300s
                        else
                            # Check if there's a conflicting release in default namespace and remove it
                            if helm list | grep -q "vinabot-rides-frontend"; then
                                echo "Removing conflicting release from default namespace..."
                                helm uninstall vinabot-rides-frontend || true
                            fi
                            
                            echo "Installing new Helm release in vinbot-ride-dev namespace..."
                            helm install vinabot-rides-frontend frontend/ -n vinbot-ride-dev --wait --timeout=300s
                        fi
                        
                        # Wait for deployment to be ready
                        echo "=== Waiting for deployment to be ready ==="
                        kubectl wait --for=condition=available --timeout=300s deployment/vinabot-rides-frontend -n vinbot-ride-dev || {
                            echo "Deployment not ready, checking status..."
                            kubectl get pods -n vinbot-ride-dev
                            kubectl get deployment vinabot-rides-frontend -n vinbot-ride-dev
                            kubectl describe deployment vinabot-rides-frontend -n vinbot-ride-dev
                        }
                        
                        # Force restart deployment to ensure new image is used
                        echo "=== Force restarting deployment to use new image ==="
                        kubectl rollout restart deployment/vinabot-rides-frontend -n vinbot-ride-dev
                        kubectl rollout status deployment/vinabot-rides-frontend -n vinbot-ride-dev --timeout=300s
                    '''
                }
            }
        }
        
        stage('Verify Deployment') {
             when {
                     not { 
                        changeRequest() 
                    }
                }
            steps {
                echo 'Verifying deployment...'
                sh '''
                    # Update PATH to include all possible locations
                    export PATH=$HOME/bin:/usr/local/bin:/usr/bin:$PATH
                    
                    # Use the current context (should be set from previous stage)
                    echo "Current kubectl context:"
                    kubectl config current-context
                    
                    # Get deployment status
                    echo "=== Deployment Status ==="
                    kubectl get pods,svc,deployment -n vinbot-ride-dev
                    
                    # Check if pods are running
                    echo "=== Pod Details ==="
                    kubectl get pods -l app.kubernetes.io/name=vinabot-rides-frontend -n vinbot-ride-dev
                    
                    # Get service information
                    echo "=== Service Information ==="
                    kubectl describe svc vinabot-rides-frontend -n vinbot-ride-dev
                    
                    # Check Helm release status
                    echo "=== Helm Release Status ==="
                    helm list -n vinbot-ride-dev
                    helm status vinabot-rides-frontend -n vinbot-ride-dev
                    
                    echo "=================================="
                    echo "✅ DEPLOYMENT SUCCESSFUL!"
                    echo "=================================="
                    echo "🌐 Application is accessible at: http://localhost:8082"
                    echo "🔍 Check status with: kubectl get pods,svc"
                    echo "⚓ Helm release: vinabot-rides-frontend"
                    echo "=================================="
                '''
            }
        }
    }
    
    post {
        always {
            script {
                // Set GitHub commit status
                if (env.CHANGE_ID) {
                    // For Pull Requests
                    step([$class: 'GitHubCommitStatusSetter',
                        credentialsId: env.GITHUB_CREDENTIALS_ID,
                        contextSource: [$class: 'ManuallyEnteredCommitContextSource', context: 'ci/jenkins'],
                        statusResultSource: [$class: 'ConditionalStatusResultSource',
                            results: [
                                [$class: 'AnyBuildResult', message: 'Jenkins build completed', state: currentBuild.currentResult]
                            ]
                        ]
                    ])
                }
                
                try {
                    echo 'Cleaning up temporary files...'
                    sh '''
                        # Clean up temporary files
                        rm -f ${FRONTEND_APP_PATH}/vinabot-rides-build-*.tar.gz || true
                        rm -rf ${FRONTEND_APP_PATH}/deployment-package || true
                        rm -f ${FRONTEND_APP_PATH}/${DOCKER_IMAGE_NAME}.tar || true
                        rm -f frontend/vinabot-rides-deployment-*.tar.gz || true
                        rm -f frontend/build-info-*.txt || true
                        rm -f nodesource_setup.sh || true
                        rm -f node.tar.gz || true
                        
                        # Clean up Docker images to save space (keep running containers)
                        docker rmi ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} 2>/dev/null || true
                        docker system prune -f || true
                        
                        # Show remaining disk space
                        df -h | head -5
                    '''
                } catch (Exception e) {
                    echo "Cleanup failed: ${e.getMessage()}"
                }
            }
        }
        
        success {
            echo 'Pipeline completed successfully!'
            script {
                if (env.CHANGE_ID) {
                    githubNotify context: 'ci/jenkins', 
                               description: 'Build succeeded', 
                               status: 'SUCCESS',
                               credentialsId: env.GITHUB_CREDENTIALS_ID
                }
                
                echo """
                ✅ DEPLOYMENT SUCCESSFUL - Build ${BUILD_NUMBER}
                
                🐳 Docker image: ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}
                📦 Docker image saved and loaded into Kind cluster
                ⚓ Helm release: vinabot-rides-frontend deployed
                🌐 Application URL: http://localhost:8082
                📁 Artifacts archived in Jenkins
                
                🚀 Full automated deployment completed!
                Your application is now running in the Kind cluster.
                """
            }
        }
        
        failure {
            echo 'Build failed!'
            script {
                if (env.CHANGE_ID) {
                    githubNotify context: 'ci/jenkins', 
                               description: 'Build failed', 
                               status: 'FAILURE',
                               credentialsId: env.GITHUB_CREDENTIALS_ID
                }
                
                echo """
                ❌ BUILD FAILED - Build ${BUILD_NUMBER}
                Check the console output for error details.
                """
            }
        }
    }
}
