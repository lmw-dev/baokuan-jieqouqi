/**
 * TOM-218: ScriptEditor组件测试
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ScriptEditor } from '../ScriptEditor'
import { ScriptDetail, SectionType, ScriptStatus, ImportanceLevel } from '@/types/script'

// Mock toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}))

// 创建测试数据
const mockScript: ScriptDetail = {
  id: 'test-script-1',
  cardId: 'test-card-1',
  title: '测试脚本标题',
  status: ScriptStatus.DRAFT,
  sections: [
    {
      id: 'section-1',
      scriptId: 'test-script-1',
      sectionType: SectionType.HOOK,
      title: '开场钩子 (0-15秒)',
      content: '测试开场内容',
      tips: ['用权威身份建立信任', '制造紧迫感和好奇心'],
      timeRange: '0-15秒',
      importance: ImportanceLevel.HIGH,
      orderIndex: 1,
      updatedAt: '2023-01-01T00:00:00Z'
    },
    {
      id: 'section-2',
      scriptId: 'test-script-1',
      sectionType: SectionType.PROBLEM,
      title: '痛点共鸣 (15-45秒)',
      content: '测试痛点内容',
      tips: ['列举目标用户的具体痛点'],
      timeRange: '15-45秒',
      importance: ImportanceLevel.MEDIUM,
      orderIndex: 2,
      updatedAt: '2023-01-01T00:00:00Z'
    }
  ],
  metadata: {
    totalSections: 2,
    lastUpdated: '2023-01-01T00:00:00Z',
    creatorId: 'test-user-1'
  },
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z'
}

const mockLoadingState = {
  isLoading: false,
  isGenerating: false,
  isSaving: false,
  isExporting: false,
}

describe('ScriptEditor', () => {
  it('应该正确渲染脚本段落', () => {
    render(
      <ScriptEditor 
        script={mockScript}
        editable={false}
        loadingState={mockLoadingState}
      />
    )

    // 检查段落标题是否渲染
    expect(screen.getByText('开场钩子 (0-15秒)')).toBeInTheDocument()
    expect(screen.getByText('痛点共鸣 (15-45秒)')).toBeInTheDocument()

    // 检查段落内容是否渲染
    expect(screen.getByText('测试开场内容')).toBeInTheDocument()
    expect(screen.getByText('测试痛点内容')).toBeInTheDocument()

    // 检查创作提示是否渲染
    expect(screen.getByText('用权威身份建立信任')).toBeInTheDocument()
  })

  it('非编辑模式下应该显示只读内容', () => {
    render(
      <ScriptEditor 
        script={mockScript}
        editable={false}
        loadingState={mockLoadingState}
      />
    )

    // 应该没有文本编辑框
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    
    // 内容应该以只读方式显示
    expect(screen.getByText('测试开场内容')).toBeInTheDocument()
  })

  it('编辑模式下应该显示文本编辑框', () => {
    render(
      <ScriptEditor 
        script={mockScript}
        editable={true}
        loadingState={mockLoadingState}
      />
    )

    // 应该有文本编辑框
    const textboxes = screen.getAllByRole('textbox')
    expect(textboxes).toHaveLength(2) // 两个段落的编辑框

    // 编辑框应该包含当前内容
    expect(textboxes[0]).toHaveValue('测试开场内容')
    expect(textboxes[1]).toHaveValue('测试痛点内容')
  })

  it('应该能够编辑段落内容', async () => {
    const mockOnUpdate = jest.fn()
    
    render(
      <ScriptEditor 
        script={mockScript}
        editable={true}
        loadingState={mockLoadingState}
        onUpdate={mockOnUpdate}
      />
    )

    const textboxes = screen.getAllByRole('textbox')
    const firstTextbox = textboxes[0]

    // 修改内容
    fireEvent.change(firstTextbox, { target: { value: '修改后的开场内容' } })

    // 等待回调被调用
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith({
        sections: expect.arrayContaining([
          expect.objectContaining({
            id: 'section-1',
            content: '修改后的开场内容'
          })
        ])
      })
    })
  })

  it('应该显示复制按钮', () => {
    render(
      <ScriptEditor 
        script={mockScript}
        editable={false}
        loadingState={mockLoadingState}
      />
    )

    // 每个段落应该有一个复制按钮
    const copyButtons = screen.getAllByRole('button')
    const copyButtonsCount = copyButtons.filter(button => 
      button.querySelector('svg') // 复制按钮包含图标
    ).length
    
    expect(copyButtonsCount).toBeGreaterThan(0)
  })

  it('应该按正确顺序显示段落', () => {
    // 创建乱序的测试数据
    const unorderedScript = {
      ...mockScript,
      sections: [
        { ...mockScript.sections[1], orderIndex: 2 },
        { ...mockScript.sections[0], orderIndex: 1 }
      ]
    }

    render(
      <ScriptEditor 
        script={unorderedScript}
        editable={false}
        loadingState={mockLoadingState}
      />
    )

    const sectionTitles = screen.getAllByRole('heading', { level: 3 })
    expect(sectionTitles[0]).toHaveTextContent('开场钩子')
    expect(sectionTitles[1]).toHaveTextContent('痛点共鸣')
  })
})