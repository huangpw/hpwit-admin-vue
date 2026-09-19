// HTTP URL检测函数
export const isHttpUrl = (path?: string): boolean => (path ? /^https?:\/\//.test(path.trim()) : false);
