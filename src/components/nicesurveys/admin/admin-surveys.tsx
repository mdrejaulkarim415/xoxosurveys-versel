'use client'

export function AdminSurveys() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-[20px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'var(--font-outfit), sans-serif' }}>
          Surveys Management
        </h2>
        <button className="ns-btn-cta px-5 py-2.5 text-[14px]">
          + Add Survey
        </button>
      </div>
      <div className="bg-white rounded-[12px] border border-[#E5E7EB] p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#F0FDF4] rounded-[10px] p-4">
            <p className="text-[12px] text-[#16A34A] font-semibold mb-1">Active Surveys</p>
            <p className="text-[28px] font-bold text-[#1A1A1A]">1,247</p>
          </div>
          <div className="bg-[#EFF6FF] rounded-[10px] p-4">
            <p className="text-[12px] text-[#2563EB] font-semibold mb-1">Total Completions</p>
            <p className="text-[28px] font-bold text-[#1A1A1A]">45,892</p>
          </div>
          <div className="bg-[#FFF7ED] rounded-[10px] p-4">
            <p className="text-[12px] text-[#D97706] font-semibold mb-1">Avg. Completion Rate</p>
            <p className="text-[28px] font-bold text-[#1A1A1A]">72.4%</p>
          </div>
        </div>
        <div className="text-center py-12 text-[#999999]">
          <p className="text-[16px]">Survey management interface</p>
          <p className="text-[14px] mt-2">Create, edit, and manage survey campaigns</p>
        </div>
      </div>
    </div>
  )
}
