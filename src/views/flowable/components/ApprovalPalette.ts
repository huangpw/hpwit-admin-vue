import type { Shape } from 'bpmn-js/lib/model/Types'

interface Palette {
  registerProvider: (provider: ApprovalPalette) => void
}

interface Creator {
  start: (event: MouseEvent, shape: Shape) => void
}

interface ShapeFactory {
  createShape: (options: { type: string }) => Shape
}

interface Connect {
  start: (event: MouseEvent) => void
}

class ApprovalPalette {
  static $inject = ['palette', 'create', 'elementFactory', 'globalConnect']

  constructor(
    palette: Palette,
    private readonly create: Creator,
    private readonly factory: ShapeFactory,
    private readonly connect: Connect,
  ) {
    palette.registerProvider(this)
  }

  getPaletteEntries() {
    const shape = (type: string, className: string, title: string) => {
      const place = (event: MouseEvent) => this.create.start(event, this.factory.createShape({ type }))
      return { group: 'nodes', className, title, action: { click: place, dragstart: place } }
    }
    return {
      'global-connect-tool': {
        group: 'tools',
        className: 'bpmn-icon-connection-multi',
        title: '连接节点',
        action: { click: (event: MouseEvent) => this.connect.start(event) },
      },
      'create.start-event': shape('bpmn:StartEvent', 'bpmn-icon-start-event-none', '开始事件'),
      'create.user-task': shape('bpmn:UserTask', 'bpmn-icon-user-task', '审批节点'),
      'create.exclusive-gateway': shape('bpmn:ExclusiveGateway', 'bpmn-icon-gateway-xor', '排他网关'),
      'create.end-event': shape('bpmn:EndEvent', 'bpmn-icon-end-event-none', '结束事件'),
    }
  }
}

export const approvalPalette = { paletteProvider: ['type', ApprovalPalette] }
