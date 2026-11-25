export const flowableModdle = {
  name: 'Flowable',
  uri: 'http://flowable.org/bpmn',
  prefix: 'flowable',
  xml: { tagAlias: 'lowerCase' },
  types: [{
    name: 'ApprovalUserTask',
    extends: ['bpmn:UserTask'],
    properties: [
      { name: 'assignee', isAttr: true, type: 'String' },
      { name: 'candidateGroups', isAttr: true, type: 'String' },
    ],
  }],
}

export interface ProcessCanvas {
  zoom: (mode: 'fit-viewport') => void
  addMarker: (id: string, marker: string) => void
}
