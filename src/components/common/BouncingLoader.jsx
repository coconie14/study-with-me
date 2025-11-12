import React from 'react';

function BouncingLoader() {
  return (
    <div className="flex justify-center items-center space-x-3 py-10">
      {/* 💡 Tailwind의 bounce 애니메이션을 사용하여 순차적으로 튀는 세 개의 파란색 공을 만듭니다. */}
      <div 
        className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"
        style={{ animationDelay: '0s' }}
      />
      <div 
        className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"
        style={{ animationDelay: '-0.15s' }} /* 딜레이를 주어 순차적으로 튀도록 만듭니다. */
      />
      <div 
        className="w-4 h-4 bg-blue-600 rounded-full animate-bounce"
        style={{ animationDelay: '-0.3s' }}
      />
    </div>
  );
}

export default BouncingLoader;