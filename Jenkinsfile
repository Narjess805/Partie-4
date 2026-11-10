pipeline {
    agent any
    options {
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        skipDefaultCheckout(true)
    }
    environment {
        // ⚠️ REMPLACE ICI par ton username Docker Hub
        IMAGE_NAME  = "docker.io/narjess805/contact-api" 
        DOCKER_CRED = "dockerhub"
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.SHORT_SHA = env.GIT_COMMIT.take(7)
                    env.IS_MAIN   = (env.BRANCH_NAME == 'main') ? 'true' : 'false'
                    echo "SHA court : ${env.SHORT_SHA}"
                    echo "Branche   : ${env.BRANCH_NAME ?: 'PR'}"
                }
            }
        }
        
        stage('Install & Quality') {
            // Contournement : on utilise l'agent principal et on lance Docker manuellement
            // à la place de l'agent { docker { ... } }
            stages {
                stage('Install') {
                    steps {
                        sh 'docker run --rm -v "$PWD:/app" -w /app node:24-alpine npm ci'
                    }
                }
                stage('Quality') {
                    parallel {
                        stage('Lint') {
                            steps {
                                sh 'docker run --rm -v "$PWD:/app" -w /app node:24-alpine npm run lint'
                            }
                        }
                        stage('Unit tests') {
                            steps {
                                sh 'docker run --rm -v "$PWD:/app" -w /app node:24-alpine npx vitest run --reporter=default --reporter=junit --outputFile.junit=reports/junit.xml'
                            }
                            post { 
                                always { 
                                    junit testResults: 'reports/junit.xml' 
                                } 
                            }
                        }
                    }
                }
            }
        }
        
        stage('Build') {
            steps {
                sh """
                    docker build \\
                      --label org.opencontainers.image.revision=${env.GIT_COMMIT} \\
                      -t ${env.IMAGE_NAME}:${env.SHORT_SHA} \\
                      -t ${env.IMAGE_NAME}:latest \\
                      .
                """
                sh "echo '${env.IMAGE_NAME}:${env.SHORT_SHA}' > image.txt"
                archiveArtifacts artifacts: 'image.txt', fingerprint: true
            }
        }
        
        stage('Push') {
            when { expression { env.IS_MAIN == 'true' } }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: env.DOCKER_CRED,
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_TOKEN'
                )]) {
                    sh 'echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin'
                    sh 'docker push "$IMAGE_NAME:$SHORT_SHA"'
                    sh 'docker push "$IMAGE_NAME:latest"'
                }
            }
        }
    }
    post {
        always {
            junit testResults: 'reports/junit.xml', allowEmptyResults: true
            archiveArtifacts artifacts: 'reports/junit.xml', allowEmptyArchive: true
        }
        success { echo "✅ Pipeline réussi — ${env.IMAGE_NAME}:${env.SHORT_SHA}" }
        failure { echo "❌ Pipeline échoué" }
        cleanup { cleanWs() }
    }
}
