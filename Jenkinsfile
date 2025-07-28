pipeline {
    agent any
    
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
        
        stage('Validate Environment') {
            steps {
                echo 'Checking build environment...'
                script {
                    sh '''
                        echo "================================================"
                        echo "🔍 ENVIRONMENT CHECK"
                        echo "================================================"
                        echo "Git version: $(git --version || echo 'Not available')"
                        echo "Node.js: $(node --version 2>/dev/null || echo 'Not available')"
                        echo "npm: $(npm --version 2>/dev/null || echo 'Not available')"
                        echo "Docker: $(docker --version 2>/dev/null || echo 'Not available')"
                        echo "kubectl: $(kubectl version --client --short 2>/dev/null || echo 'Not available')"
                        echo "kind: $(kind version 2>/dev/null || echo 'Not available')"
                        echo "helm: $(helm version --short 2>/dev/null || echo 'Not available')"
                        echo "================================================"
                    '''
                }
            }
        }
        
        stage('Build Instructions') {
            steps {
                echo 'Providing deployment instructions...'
                script {
                    sh '''
                        echo ""
                        echo "================================================"
                        echo "📋 VINABOT RIDES - FRONTEND DEPLOYMENT GUIDE"
                        echo "================================================"
                        echo ""
                        echo "✅ Source code successfully checked out!"
                        echo "📂 Project structure:"
                        ls -la
                        echo ""
                        echo "📁 Frontend app location:"
                        ls -la frontend/vinabot-rides-app/
                        echo ""
                        echo "🚀 DEPLOYMENT STEPS:"
                        echo ""
                        echo "1️⃣  Install Dependencies:"
                        echo "   cd ${WORKSPACE}/frontend/vinabot-rides-app"
                        echo "   npm ci"
                        echo ""
                        echo "2️⃣  Build Angular Application:"
                        echo "   npm run build"
                        echo ""
                        echo "3️⃣  Build Docker Image:"
                        echo "   docker build -t vinabot-rides-frontend:latest ."
                        echo ""
                        echo "4️⃣  Load Image to Kind Cluster:"
                        echo "   kind load docker-image vinabot-rides-frontend:latest --name vinabot-rides"
                        echo ""
                        echo "5️⃣  Deploy with Helm:"
                        echo "   cd ${WORKSPACE}/frontend/deployment/helm"
                        echo "   helm install vinabot-rides-frontend frontend/"
                        echo ""
                        echo "6️⃣  Access Application:"
                        echo "   🌐 http://localhost:8082"
                        echo ""
                        echo "================================================"
                        echo "📋 QUICK COPY-PASTE COMMANDS:"
                        echo "================================================"
                        echo ""
                        echo "# Navigate to frontend directory"
                        echo "cd ${WORKSPACE}/frontend/vinabot-rides-app"
                        echo ""
                        echo "# Install dependencies and build"
                        echo "npm ci && npm run build"
                        echo ""
                        echo "# Build and deploy Docker image"
                        echo "docker build -t vinabot-rides-frontend:latest ."
                        echo "kind load docker-image vinabot-rides-frontend:latest --name vinabot-rides"
                        echo ""
                        echo "# Deploy with Helm"
                        echo "cd ../deployment/helm"
                        echo "helm install vinabot-rides-frontend frontend/"
                        echo ""
                        echo "# Check deployment status"
                        echo "kubectl get pods,svc"
                        echo ""
                        echo "================================================"
                        echo "✅ JENKINS PIPELINE COMPLETED SUCCESSFULLY!"
                        echo "📝 Follow the manual steps above to complete deployment"
                        echo "================================================"
                    '''
                }
            }
        }
        
        stage('Verify Project Files') {
            steps {
                echo 'Verifying project structure...'
                script {
                    sh '''
                        echo ""
                        echo "🔍 VERIFYING PROJECT FILES:"
                        echo ""
                        echo "📋 Frontend app files:"
                        if [ -f "frontend/vinabot-rides-app/package.json" ]; then
                            echo "✅ package.json found"
                            echo "📦 Dependencies:"
                            grep -A 5 -B 5 '"dependencies"' frontend/vinabot-rides-app/package.json || echo "Could not read dependencies"
                        else
                            echo "❌ package.json not found"
                        fi
                        echo ""
                        
                        echo "🐳 Docker files:"
                        if [ -f "frontend/vinabot-rides-app/Dockerfile" ]; then
                            echo "✅ Dockerfile found"
                        else
                            echo "❌ Dockerfile not found"
                        fi
                        echo ""
                        
                        echo "⚓ Helm chart files:"
                        if [ -d "frontend/deployment/helm/frontend" ]; then
                            echo "✅ Helm chart directory found"
                            ls -la frontend/deployment/helm/frontend/
                        else
                            echo "❌ Helm chart directory not found"
                        fi
                        echo ""
                        
                        echo "🎯 Kind configuration:"
                        if [ -f "frontend/deployment/kind-config.yaml" ]; then
                            echo "✅ Kind config found"
                            cat frontend/deployment/kind-config.yaml
                        else
                            echo "❌ Kind config not found"
                        fi
                    '''
                }
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline completed successfully!'
            script {
                echo """
                ================================================
                ✅ JENKINS PIPELINE SUCCESS - BUILD ${BUILD_NUMBER}
                ================================================
                
                📦 Source code: Successfully checked out
                📝 Instructions: Provided above
                🚀 Ready for: Manual deployment
                
                💡 TIP: Copy the commands from the 'Build Instructions' 
                stage and run them in your terminal to deploy the application.
                
                🌐 Expected URL: http://localhost:8082
                ================================================
                """
            }
        }
        
        failure {
            echo 'Pipeline failed!'
            script {
                echo """
                ❌ JENKINS PIPELINE FAILED - BUILD ${BUILD_NUMBER}
                
                Please check the logs above for error details.
                The most common issues are:
                - Missing tools in Jenkins environment
                - Permission issues
                - Network connectivity problems
                """
            }
        }
    }
}
