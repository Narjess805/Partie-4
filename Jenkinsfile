pipeline {
    agent any
    options {
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
        skipDefaultCheckout(true)
    }
    environment {
        IMAGE_NAME  = "docker.io/narjessdabbech/contact-api"
        DOCKER_CRED = "dockerhub"
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()
                    env.SHORT_SHA = env.GIT_COMMIT.take(7)
                    env.IS_MAIN   = (env.BRANCH_NAME == 'main') ? 'true' : 'false'
                    echo "SHA court : ${env.SHORT_SHA}"
                    echo "Branche   : ${env.BRANCH_NAME ?: 'PR'}"
                }
            }
        }

        stage('Install & Quality') {
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
                                sh 'docker run --rm -v "$PWD:/app" -w /app node:24-alpine npx vitest run tests/contact.test.js --reporter=default --reporter=junit --outputFile.junit=reports/junit.xml'
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

        stage('Security') {
            parallel {
                stage('Gitleaks') {
                    steps {
                        sh 'docker run --rm -v "$PWD:/repo" zricethezav/gitleaks:v8.18.0 detect --source /repo -v'
                    }
                }
                stage('Semgrep') {
                    steps {
                        sh 'docker run --rm -v "$PWD:/src" semgrep/semgrep semgrep scan --config p/javascript --config p/owasp-top-ten --error /src'
                    }
                }
                stage('npm audit') {
                    steps {
                        sh 'docker run --rm -v "$PWD:/app" -w /app node:24-alpine npm audit --audit-level=high || true'
                    }
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'reports/**', allowEmptyArchive: true
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

        stage('Image scan') {
            steps {
                sh """
                    docker run --rm -v "$PWD:/src" aquasec/trivy:latest config /src
                """
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
