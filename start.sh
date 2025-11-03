#!/bin/bash

echo "🎤 Starting Penny is Paying..."
echo ""

# Check if node_modules exist
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd frontend && npm install && cd ..
fi

echo ""
echo "🚀 Starting servers..."
echo "   Backend: http://localhost:3001"
echo "   Frontend: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start backend in background
cd backend && npm start &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend in background
cd ../frontend && npm run dev &
FRONTEND_PID=$!

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID

