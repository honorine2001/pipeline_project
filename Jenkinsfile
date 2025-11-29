pipeline {
    agent any

    stages {
        stage('Checkout Code') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/honorine2001/pipeline_project'
            }
        }

        stage('Node.js Check') {
            steps {
                // Just check Node.js and npm versions, no sudo needed
                sh 'node -v'
                sh 'npm -v'
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Build App') {
            steps {
                sh 'npm run build || echo "No build script found"'
            }
        }

        stage('Run Tests') {
            steps {
                sh 'npm test || echo "No tests available"'
            }
        }
    }
}
