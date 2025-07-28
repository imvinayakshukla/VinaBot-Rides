pipeline {
    agent {
        docker {
            image 'jenkins/agent:latest'
            args '--privileged -v /var/run/docker.sock:/var/run/docker.sock'
        }
    }
    
    environment {
        // Local development with Kind - no external registry needed
        DOCKER_IMAGE_NAME = 'vinabot-rides-frontend'
        DOCKER_IMAGE_TAG = 'latest'
        HELM_CHART_PATH = 'frontend/deployment/helm'
        FRONTEND_APP_PATH = 'frontend/vinabot-rides-app'
        KIND_CLUSTER_NAME = 'vinabot-rides'
    }
    
    triggers {
        // Trigger build when changes are pushed to dev branch
        githubPush()
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code...'
                checkout scm
            }
        }
        
        stage('Setup Build Environment') {
            steps {
                echo 'Setting up build environment...'
                sh '''
                    # Install necessary tools
                    apk update
                    apk add --no-cache curl bash git nodejs npm

                    # Install Kind
                    curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
                    chmod +x ./kind
                    mv ./kind /usr/local/bin/kind

                    # Install kubectl
                    curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
                    chmod +x kubectl
                    mv ./kubectl /usr/local/bin/kubectl

                    # Install Helm
                    curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

                    # Verify installations
                    docker --version
                    node --version
                    npm --version
                    kind version
                    kubectl version --client
                    helm version
                '''
            }
        }
        
        stage('Install Dependencies & Build App') {
            steps {
                echo 'Installing Node.js dependencies and building Angular app...'
                dir("${FRONTEND_APP_PATH}") {
                    sh '''
                        # Install dependencies
                        npm ci
                        
                        # Build the application
                        npm run build
                        
                        # Verify build output
                        ls -la dist/
                    '''
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                dir("${FRONTEND_APP_PATH}") {
                    sh '''
                        # Build Docker image exactly as specified
                        docker build -t ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} .
                        
                        # Verify image was created
                        docker images | grep ${DOCKER_IMAGE_NAME}
                    '''
                }
            }
        }
        
        stage('Load Image to Kind Cluster') {
            steps {
                echo 'Loading Docker image into Kind cluster...'
                sh '''
                    # Check if Kind cluster exists
                    if ! kind get clusters | grep -q '${KIND_CLUSTER_NAME}'; then
                        echo "ERROR: Kind cluster '${KIND_CLUSTER_NAME}' not found!"
                        echo "Creating Kind cluster with config..."
                        kind create cluster --config frontend/deployment/kind-config.yaml --name ${KIND_CLUSTER_NAME}
                    fi
                    
                    echo "Found Kind cluster: ${KIND_CLUSTER_NAME}"
                    
                    # Load the Docker image into Kind cluster
                    kind load docker-image ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} --name ${KIND_CLUSTER_NAME}
                    
                    echo "Docker image loaded into Kind cluster successfully"
                '''
            }
        }
        
        stage('Deploy with Helm') {
            steps {
                echo 'Deploying to Kubernetes using Helm...'
                dir("${HELM_CHART_PATH}") {
                    sh '''
                        # Set kubectl context to Kind cluster
                        kubectl config use-context kind-${KIND_CLUSTER_NAME}
                        
                        # Verify cluster connection
                        kubectl cluster-info
                        
                        # Update image tag in values.yaml
                        sed -i 's/tag: .*/tag: "${DOCKER_IMAGE_TAG}"/' frontend/values.yaml
                        
                        # Deploy with Helm (uninstall first if exists)
                        helm uninstall vinabot-rides-frontend 2>/dev/null || echo "Release not found, proceeding with fresh install"
                        
                        # Install with Helm
                        helm install vinabot-rides-frontend frontend/
                        
                        # Wait for deployment to be ready
                        kubectl wait --for=condition=available --timeout=300s deployment/vinabot-rides-frontend
                    '''
                }
            }
        }
        
        stage('Verify Deployment') {
            steps {
                echo 'Verifying deployment...'
                sh '''
                    # Get deployment status
                    kubectl get pods,svc
                    
                    # Check if pods are running
                    kubectl get pods -l app.kubernetes.io/name=vinabot-rides-frontend
                    
                    # Get service information
                    kubectl describe svc vinabot-rides-frontend
                    
                    echo "=================================="
                    echo "✅ DEPLOYMENT SUCCESSFUL!"
                    echo "=================================="
                    echo "🌐 Application is accessible at: http://localhost:8082"
                    echo "🔍 Check status with: kubectl get pods,svc"
                    echo "=================================="
                '''
            }
        }
    }
    
    post {
        always {
            script {
                try {
                    echo 'Cleaning up...'
                    sh '''
                        # Clean up Docker images to save space
                        docker rmi ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} || true
                        docker system prune -f || true
                    '''
                } catch (Exception e) {
                    echo "Cleanup failed: ${e.getMessage()}"
                }
            }
        }
        
        success {
            echo 'Pipeline completed successfully!'
            script {
                echo """
                ✅ DEPLOYMENT SUCCESSFUL - Build ${BUILD_NUMBER}
                
                🐳 Docker image: ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}
                ⚓ Helm release: vinabot-rides-frontend
                🌐 Application URL: http://localhost:8082
                
                Deployment completed automatically!
                """
            }
        }
        
        failure {
            echo 'Pipeline failed!'
            script {
                echo """
                ❌ DEPLOYMENT FAILED - Build ${BUILD_NUMBER}
                
                Check the logs above for error details.
                Common issues:
                - Docker service not running
                - Kind cluster not accessible
                - Port conflicts
                - Helm chart issues
                """
            }
        }
    }
}
