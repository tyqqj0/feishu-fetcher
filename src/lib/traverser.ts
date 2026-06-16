import { stderr } from 'node:process';
import { getChildDepartments, getUsersByDepartment } from './feishu-client.js';
import type { FeishuUser } from '../types.js';

export async function traverseAndCollect(
  token: string,
  rootDepartmentId: string = '0'
): Promise<FeishuUser[]> {
  const users = new Map<string, FeishuUser>();
  const queue: string[] = [rootDepartmentId];
  let departmentCount = 0;

  while (queue.length > 0) {
    const deptId = queue.shift()!;
    departmentCount++;

    // Fetch all users in this department (paginated)
    let pageToken: string | undefined;
    do {
      const result = await getUsersByDepartment(token, deptId, pageToken);
      for (const item of result.items) {
        if (!users.has(item.open_id)) {
          users.set(item.open_id, {
            name: item.name || '',
            open_id: item.open_id || '',
            user_id: item.user_id || '',
            union_id: item.union_id || '',
          });
        }
      }
      pageToken = result.hasMore ? result.pageToken : undefined;
    } while (pageToken);

    // Fetch all child departments (paginated)
    let deptPageToken: string | undefined;
    do {
      const result = await getChildDepartments(token, deptId, deptPageToken);
      for (const child of result.items) {
        queue.push(child.open_department_id);
      }
      deptPageToken = result.hasMore ? result.pageToken : undefined;
    } while (deptPageToken);

    stderr.write(`\r  Scanned ${departmentCount} departments, ${users.size} users found`);
  }

  stderr.write('\n');
  return Array.from(users.values());
}
