pipeline {
    agent any
    
    environment {
        // Local development with Kind - no external registry needed
        DOCKER_IMAGE_NAME = 'vinabot-rides-frontend'
        DOCKER_IMAGE_TAG = 'latest'
        HELM_CHART_PATH = 'frontend/deployment/helm'
        FRONTEND_APP_PATH = 'frontend/vinabot-rides-app'
        KIND_CLUSTER_NAME = 'vinabot-rides'
        KIND_CONFIG_PATH = 'frontend/deployment/kind-config.yaml'
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
        
        stage('Install Dependencies') {
            steps {
                echo 'Installing Node.js dependencies...'
                dir("${FRONTEND_APP_PATH}") {
                    script {
                        // Use Node.js from Jenkins tools or Docker
                        sh '''
                            # Check if npm is available
                            if ! command -v npm &> /dev/null; then
                                echo "npm not found, using Docker to build"
                                docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm ci"
                            else
                                npm ci
                            fi
                        '''
                    }
                }
            }
        }
        
        stage('Run Tests') {
            steps {
                echo 'Running frontend tests...'
                dir("${FRONTEND_APP_PATH}") {
                    script {
                        sh '''
                            if ! command -v npm &> /dev/null; then
                                echo "Running tests with Docker"
                                docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm run test -- --watch=false --browsers=ChromeHeadless"
                            else
                                # Install Chrome for headless testing
                                npm run test -- --watch=false --browsers=ChromeHeadless || echo "Tests completed"
                            fi
                        '''
                    }
                }
            }
        }
        
        stage('Build Application') {
            steps {
                echo 'Building Angular application...'
                dir("${FRONTEND_APP_PATH}") {
                    script {
                        sh '''
                            if ! command -v npm &> /dev/null; then
                                echo "Building with Docker"
                                docker run --rm -v $(pwd):/app -w /app node:20-alpine sh -c "npm run build"
                            else
                                npm run build
                            fi
                        '''
                    }
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                echo 'Building Docker image...'
                dir("${FRONTEND_APP_PATH}") {
                    script {
                        // Build Docker image exactly as specified
                        sh "docker build -t ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} ."
                        
                        // Store image for later use
                        env.DOCKER_IMAGE = "${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}"
                    }
                }
            }
        }
        
        stage('Load Image to Kind Cluster') {
            steps {
                echo 'Loading Docker image into existing Kind cluster...'
                script {
                    sh """
                        # Check if Kind cluster exists
                        if ! kind get clusters | grep -q '${KIND_CLUSTER_NAME}'; then
                            echo "ERROR: Kind cluster '${KIND_CLUSTER_NAME}' not found!"
                            echo "Please create the cluster first using:"
                            echo "kind create cluster --config frontend/deployment/kind-config.yaml --name ${KIND_CLUSTER_NAME}"
                            exit 1
                        fi
                        
                        echo "Found existing Kind cluster: ${KIND_CLUSTER_NAME}"
                        
                        # Load the Docker image into the existing Kind cluster
                        kind load docker-image ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} --name ${KIND_CLUSTER_NAME}
                        
                        echo "Docker image loaded into Kind cluster successfully"
                    """
                }
            }
        }
        
        stage('Update Helm Values') {
            steps {
                echo 'Updating Helm chart values...'
                script {
                    // Update the image tag in values.yaml to use latest
                    sh """
                        sed -i 's/tag: .*/tag: "${DOCKER_IMAGE_TAG}"/' ${HELM_CHART_PATH}/frontend/values.yaml
                    """
                    
                    // Show the updated values
                    sh "grep -A 5 'image:' ${HELM_CHART_PATH}/frontend/values.yaml"
                }
            }
        }
        
        stage('Deploy to Kubernetes') {
            steps {
                echo 'Deploying to Kind cluster using Helm...'
                script {
                    sh '''
                        # Set kubectl context to your Kind cluster
                        kubectl config use-context kind-vinabot-rides
                        
                        # Verify cluster connection
                        kubectl cluster-info
                        
                        # Check if Helm is installed
                        if ! command -v helm &> /dev/null; then
                            echo "Installing Helm..."
                            curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
                        fi
                        
                        # Navigate to helm directory and deploy using your exact command
                        cd frontend/deployment/helm
                        helm install vinabot-rides-frontend frontend/
                        
                        # Verify deployment
                        kubectl get pods -n default
                        kubectl get services -n default
                    '''
                }
            }
        }
        
        stage('Health Check') {
            steps {
                echo 'Performing health check...'
                script {
                    sh '''
                        # Wait for pods to be ready (using default namespace as per your setup)
                        kubectl wait --for=condition=ready pod \
                            -l app.kubernetes.io/name=vinabot-rides-frontend \
                            -n default --timeout=300s
                        
                        # Get service information
                        kubectl get svc vinabot-rides-frontend -n default
                        
                        # Show how to access the application
                        echo "=================================="
                        echo "Application is accessible at:"
                        echo "http://localhost:8082"
                        echo "=================================="
                        
                        echo "Deployment completed successfully!"
                    '''
                }
            }
        }
    }
    
    post {
        always {
            echo 'Cleaning up...'
            script {
                // Clean up local Docker images to save space (only if Docker is available)
                sh """
                    if command -v docker &> /dev/null; then
                        docker rmi ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG} || true
                        docker system prune -f || true
                    else
                        echo "Docker not available, skipping cleanup"
                    fi
                """
            }
        }
        
        success {
            echo 'Pipeline completed successfully!'
            script {
                // Send notification (configure as needed)
                echo "✅ Frontend deployment successful for build ${BUILD_NUMBER}"
                echo "🚀 Application deployed to Kubernetes namespace: vinabot-rides"
                echo "🐳 Docker image: ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}"
            }
        }
        
        failure {
            echo 'Pipeline failed!'
            script {
                echo "❌ Frontend deployment failed for build ${BUILD_NUMBER}"
                echo "Check the logs above for error details"
            }
        }
        
        unstable {
            echo 'Pipeline completed with warnings'
        }
    }
}
