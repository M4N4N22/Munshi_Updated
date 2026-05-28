import { Attendance } from 'src/services/attendance/attendance.schema';
import {
  Department,
  DepartmentWorker,
} from 'src/services/departments/departments.schema';
import { Factory, FactoryUser } from 'src/services/factories/factories.schema';
import { Issue } from 'src/services/issues/issues.schema';
import { Task, TaskUpdate } from 'src/services/tasks/tasks.schema';
import { User } from 'src/services/users/users.schema';

export const MONGOOSE_MODELS = {};

export const SQL_MODELS = {
  Attendance: Attendance.setup,
  Department: Department.setup,
  DepartmentWorker: DepartmentWorker.setup,
  Factory: Factory.setup,
  FactoryUser: FactoryUser.setup,
  Issue: Issue.setup,
  Task: Task.setup,
  TaskUpdate: TaskUpdate.setup,
  User: User.setup,
};
